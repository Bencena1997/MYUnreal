"""
Video Processing Utilities
معالج الفيديوهات - يحتوي على دوال تقسيم الفيديو
"""

import subprocess
import os
import json
from pathlib import Path


def get_video_duration(video_path):
    """
    الحصول على مدة الفيديو بالثواني
    
    Args:
        video_path: مسار ملف الفيديو
    
    Returns:
        float: مدة الفيديو بالثواني
    """
    try:
        # استخدام FFprobe (يجي مع FFmpeg) للحصول على معلومات الفيديو
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        # الحصول على المدة من معلومات الصيغة
        duration = float(data['format']['duration'])
        return duration
        
    except Exception as e:
        print(f"خطأ في الحصول على مدة الفيديو: {e}")
        raise


def split_video(input_path, output_folder, num_parts, base_filename, overlap_seconds=0):
    """
    تقسيم الفيديو إلى أجزاء متساوية مع دعم التداخل
    
    Args:
        input_path: مسار الفيديو المدخل
        output_folder: مجلد حفظ الأجزاء
        num_parts: عدد الأجزاء المطلوبة
        base_filename: الاسم الأساسي للملف (بدون الامتداد)
        overlap_seconds: عدد ثواني التداخل بين الأجزاء (افتراضي: 0)
    
    Returns:
        list: قائمة بأسماء الملفات الناتجة
    """
    try:
        # الحصول على مدة الفيديو
        total_duration = get_video_duration(input_path)
        print(f"مدة الفيديو الكلية: {total_duration} ثانية")
        
        # حساب مدة كل جزء
        part_duration = total_duration / num_parts
        print(f"مدة كل جزء: {part_duration} ثانية")
        
        if overlap_seconds > 0:
            print(f"تداخل بين الأجزاء: {overlap_seconds} ثانية")
        
        # إنشاء مجلد المخرجات إذا لم يكن موجوداً
        os.makedirs(output_folder, exist_ok=True)
        
        # قائمة الملفات الناتجة
        output_files = []
        
        # تقسيم الفيديو
        for i in range(num_parts):
            # حساب نقطة البداية لكل جزء
            # الجزء الأول يبدأ من 0
            # الأجزاء التالية تبدأ من (نهاية الجزء السابق - التداخل)
            if i == 0:
                start_time = 0
            else:
                start_time = (i * part_duration) - overlap_seconds
            
            # التأكد من أن نقطة البداية لا تكون سالبة
            start_time = max(0, start_time)
            
            # حساب مدة هذا الجزء
            if i == 0:
                # الجزء الأول: المدة الأساسية فقط (بدون إضافة التداخل)
                duration = part_duration
            elif i == num_parts - 1:
                # الجزء الأخير: من نقطة البداية حتى نهاية الفيديو
                duration = total_duration - start_time
            else:
                # الأجزاء الوسطى: المدة الأساسية + التداخل
                duration = part_duration + overlap_seconds
            
            # اسم الملف الناتج
            output_filename = f"{base_filename}_part{i + 1}.mp4"
            output_path = os.path.join(output_folder, output_filename)
            
            print(f"جاري معالجة الجزء {i + 1}/{num_parts}...")
            print(f"  - البداية: {start_time:.2f} ثانية")
            print(f"  - المدة: {duration:.2f} ثانية")
            print(f"  - النهاية: {start_time + duration:.2f} ثانية")
            
            # أمر FFmpeg
            cmd = [
                'ffmpeg',
                '-i', input_path,              # الملف المدخل
                '-ss', str(start_time),        # نقطة البداية
                '-t', str(duration),           # المدة
                '-c', 'copy',                  # نسخ بدون إعادة ترميز
                '-avoid_negative_ts', '1',     # تجنب مشاكل الـ timestamps
                '-y',                          # الكتابة فوق الملف إذا كان موجوداً
                output_path
            ]
            
            # تشغيل الأمر
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # التحقق من نجاح العملية
            if os.path.exists(output_path):
                output_files.append({
                    'filename': output_filename,
                    'path': output_path,
                    'part_number': i + 1,
                    'start_time': start_time,
                    'duration': duration,
                    'size': os.path.getsize(output_path)
                })
                print(f"✓ تم إنشاء: {output_filename}")
            else:
                raise Exception(f"فشل إنشاء الملف: {output_filename}")
        
        print(f"✓ تم تقسيم الفيديو بنجاح إلى {num_parts} أجزاء!")
        if overlap_seconds > 0:
            print(f"  مع تداخل {overlap_seconds} ثانية بين كل جزء")
        return output_files
        
    except subprocess.CalledProcessError as e:
        print(f"خطأ في تشغيل FFmpeg: {e}")
        print(f"الخطأ: {e.stderr}")
        raise Exception(f"فشل تقسيم الفيديو: {e.stderr}")
    except Exception as e:
        print(f"خطأ عام: {e}")
        raise


def format_duration(seconds):
    """
    تحويل الثواني إلى صيغة قابلة للقراءة
    
    Args:
        seconds: عدد الثواني
    
    Returns:
        str: الوقت بصيغة HH:MM:SS أو MM:SS
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"


def format_file_size(size_bytes):
    """
    تحويل حجم الملف بالبايتات إلى صيغة قابلة للقراءة
    
    Args:
        size_bytes: حجم الملف بالبايتات
    
    Returns:
        str: حجم الملف بصيغة مفهومة
    """
    for unit in ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} تيرابايت"


def check_ffmpeg_installed():
    """
    التحقق من تثبيت FFmpeg
    
    Returns:
        bool: True إذا كان FFmpeg مثبتاً
    """
    try:
        subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def convert_video_format(input_path, output_folder, output_format, quality='medium'):
    """
    تحويل صيغة الفيديو
    
    Args:
        input_path: مسار الفيديو المدخل
        output_folder: مجلد حفظ الملف المحول
        output_format: الصيغة المطلوبة (mp4, avi, mov, mkv, webm, flv, wmv)
        quality: جودة التحويل (low, medium, high, original)
    
    Returns:
        dict: معلومات الملف المحول
    """
    try:
        # إنشاء مجلد المخرجات إذا لم يكن موجوداً
        os.makedirs(output_folder, exist_ok=True)
        
        # الاسم الأساسي بدون الامتداد
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        
        # اسم الملف الناتج
        output_filename = f"{base_name}_converted.{output_format}"
        output_path = os.path.join(output_folder, output_filename)
        
        print(f"جاري تحويل الفيديو من {os.path.splitext(input_path)[1]} إلى .{output_format}...")
        
        # إعدادات الجودة
        quality_settings = {
            'low': {
                'video_bitrate': '500k',
                'audio_bitrate': '96k',
                'crf': '28'
            },
            'medium': {
                'video_bitrate': '1500k',
                'audio_bitrate': '128k',
                'crf': '23'
            },
            'high': {
                'video_bitrate': '3000k',
                'audio_bitrate': '192k',
                'crf': '18'
            },
            'original': {
                'copy': True  # نسخ بدون إعادة ترميز
            }
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        # بناء أمر FFmpeg
        cmd = ['ffmpeg', '-i', input_path]
        
        if settings.get('copy'):
            # نسخ بدون إعادة ترميز (أسرع)
            cmd.extend(['-c', 'copy'])
        else:
            # إعادة ترميز مع إعدادات الجودة
            cmd.extend([
                '-c:v', 'libx264',  # codec الفيديو
                '-b:v', settings['video_bitrate'],  # bitrate الفيديو
                '-c:a', 'aac',  # codec الصوت
                '-b:a', settings['audio_bitrate'],  # bitrate الصوت
                '-crf', settings['crf']  # معامل الجودة
            ])
        
        # إضافات خاصة بصيغة WebM
        if output_format.lower() == 'webm':
            cmd = ['ffmpeg', '-i', input_path]
            cmd.extend([
                '-c:v', 'libvpx-vp9',  # codec خاص بـ WebM
                '-b:v', settings.get('video_bitrate', '1500k'),
                '-c:a', 'libopus',  # codec صوت خاص بـ WebM
                '-b:a', settings.get('audio_bitrate', '128k')
            ])
        
        # إضافة مسار الملف الناتج
        cmd.extend(['-y', output_path])  # -y للكتابة فوق الملف إذا كان موجوداً
        
        print(f"تنفيذ الأمر: {' '.join(cmd)}")
        
        # تشغيل الأمر
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # التحقق من نجاح العملية
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            duration = get_video_duration(output_path)
            
            print(f"✓ تم التحويل بنجاح إلى: {output_filename}")
            
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': file_size,
                'duration': duration,
                'format': output_format,
                'quality': quality
            }
        else:
            raise Exception(f"فشل إنشاء الملف: {output_filename}")
        
    except subprocess.CalledProcessError as e:
        print(f"خطأ في تشغيل FFmpeg: {e}")
        print(f"الخطأ: {e.stderr}")
        raise Exception(f"فشل تحويل الفيديو: {e.stderr}")
    except Exception as e:
        print(f"خطأ عام: {e}")
        raise


if __name__ == "__main__":
    # اختبار سريع
    if check_ffmpeg_installed():
        print("✓ FFmpeg مثبت بنجاح!")
    else:
        print("✗ FFmpeg غير مثبت!")


def convert_audio_format(input_path, output_folder, output_format, quality='medium'):
    """
    تحويل صيغة الصوت أو استخراج الصوت من الفيديو
    
    Args:
        input_path: مسار الملف المدخل (صوت أو فيديو)
        output_folder: مجلد حفظ الملف المحول
        output_format: الصيغة المطلوبة (mp3, wav, aac, ogg, flac, m4a)
        quality: جودة الصوت (low, medium, high, best)
    
    Returns:
        dict: معلومات الملف المحول
    """
    try:
        # إنشاء مجلد المخرجات إذا لم يكن موجوداً
        os.makedirs(output_folder, exist_ok=True)
        
        # الاسم الأساسي بدون الامتداد
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        
        # اسم الملف الناتج
        output_filename = f"{base_name}_audio.{output_format}"
        output_path = os.path.join(output_folder, output_filename)
        
        # التحقق من نوع الملف المدخل
        input_ext = os.path.splitext(input_path)[1].lower()
        is_video = input_ext in ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm']
        
        if is_video:
            print(f"جاري استخراج الصوت من الفيديو...")
        else:
            print(f"جاري تحويل الصوت من {input_ext} إلى .{output_format}...")
        
        # إعدادات جودة الصوت
        quality_settings = {
            'low': {
                'bitrate': '96k',
                'sample_rate': '22050'
            },
            'medium': {
                'bitrate': '128k',
                'sample_rate': '44100'
            },
            'high': {
                'bitrate': '192k',
                'sample_rate': '48000'
            },
            'best': {
                'bitrate': '320k',
                'sample_rate': '48000'
            }
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        # بناء أمر FFmpeg
        cmd = ['ffmpeg', '-i', input_path]
        
        # إعدادات خاصة لكل صيغة
        if output_format.lower() == 'mp3':
            cmd.extend([
                '-vn',  # بدون فيديو
                '-c:a', 'libmp3lame',  # codec MP3
                '-b:a', settings['bitrate'],
                '-ar', settings['sample_rate']
            ])
        elif output_format.lower() == 'wav':
            cmd.extend([
                '-vn',
                '-c:a', 'pcm_s16le',  # WAV codec
                '-ar', settings['sample_rate']
            ])
        elif output_format.lower() == 'aac':
            cmd.extend([
                '-vn',
                '-c:a', 'aac',
                '-b:a', settings['bitrate'],
                '-ar', settings['sample_rate']
            ])
        elif output_format.lower() == 'ogg':
            cmd.extend([
                '-vn',
                '-c:a', 'libvorbis',  # OGG codec
                '-b:a', settings['bitrate'],
                '-ar', settings['sample_rate']
            ])
        elif output_format.lower() == 'flac':
            cmd.extend([
                '-vn',
                '-c:a', 'flac',  # FLAC codec (lossless)
                '-ar', settings['sample_rate']
            ])
        elif output_format.lower() == 'm4a':
            cmd.extend([
                '-vn',
                '-c:a', 'aac',
                '-b:a', settings['bitrate'],
                '-ar', settings['sample_rate']
            ])
        else:
            # صيغة افتراضية
            cmd.extend([
                '-vn',
                '-c:a', 'aac',
                '-b:a', settings['bitrate']
            ])
        
        # إضافة مسار الملف الناتج
        cmd.extend(['-y', output_path])
        
        print(f"تنفيذ الأمر: {' '.join(cmd)}")
        
        # تشغيل الأمر
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # التحقق من نجاح العملية
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            
            # الحصول على مدة الصوت
            try:
                duration = get_audio_duration(output_path)
            except:
                duration = 0
            
            action = "استخراج" if is_video else "تحويل"
            print(f"✓ تم {action} الصوت بنجاح إلى: {output_filename}")
            
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': file_size,
                'duration': duration,
                'format': output_format,
                'quality': quality,
                'is_extracted': is_video
            }
        else:
            raise Exception(f"فشل إنشاء الملف: {output_filename}")
        
    except subprocess.CalledProcessError as e:
        print(f"خطأ في تشغيل FFmpeg: {e}")
        print(f"الخطأ: {e.stderr}")
        raise Exception(f"فشل معالجة الصوت: {e.stderr}")
    except Exception as e:
        print(f"خطأ عام: {e}")
        raise


def get_audio_duration(audio_path):
    """
    الحصول على مدة الملف الصوتي بالثواني
    
    Args:
        audio_path: مسار ملف الصوت
    
    Returns:
        float: مدة الصوت بالثواني
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        duration = float(data['format']['duration'])
        return duration
        
    except Exception as e:
        print(f"خطأ في الحصول على مدة الصوت: {e}")
        return 0


def compress_video(input_path, output_folder, compression_level='medium'):
    """
    ضغط الفيديو لتقليل الحجم
    
    Args:
        input_path: مسار الفيديو المدخل
        output_folder: مجلد حفظ الملف المضغوط
        compression_level: مستوى الضغط (low, medium, high)
    
    Returns:
        dict: معلومات الملف المضغوط
    """
    try:
        os.makedirs(output_folder, exist_ok=True)
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_filename = f"{base_name}_compressed.mp4"
        output_path = os.path.join(output_folder, output_filename)
        
        print(f"جاري ضغط الفيديو...")
        
        # إعدادات الضغط
        compression_settings = {
            'low': {'crf': '28', 'preset': 'fast'},      # ضغط خفيف
            'medium': {'crf': '23', 'preset': 'medium'}, # ضغط متوسط
            'high': {'crf': '18', 'preset': 'slow'}      # ضغط عالي (حجم أصغر)
        }
        
        settings = compression_settings.get(compression_level, compression_settings['medium'])
        
        cmd = [
            'ffmpeg', '-i', input_path,
            '-c:v', 'libx264',
            '-crf', settings['crf'],
            '-preset', settings['preset'],
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y', output_path
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if os.path.exists(output_path):
            original_size = os.path.getsize(input_path)
            compressed_size = os.path.getsize(output_path)
            reduction = ((original_size - compressed_size) / original_size) * 100
            
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': compressed_size,
                'original_size': original_size,
                'reduction_percent': reduction,
                'duration': get_video_duration(output_path)
            }
        else:
            raise Exception("فشل ضغط الفيديو")
            
    except Exception as e:
        print(f"خطأ في ضغط الفيديو: {e}")
        raise


def trim_video(input_path, output_folder, start_time, end_time):
    """
    قص الفيديو (اختيار جزء معين)
    
    Args:
        input_path: مسار الفيديو المدخل
        output_folder: مجلد حفظ الملف المقصوص
        start_time: وقت البداية بالثواني
        end_time: وقت النهاية بالثواني
    
    Returns:
        dict: معلومات الملف المقصوص
    """
    try:
        os.makedirs(output_folder, exist_ok=True)
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_filename = f"{base_name}_trimmed.mp4"
        output_path = os.path.join(output_folder, output_filename)
        
        duration = end_time - start_time
        
        print(f"جاري قص الفيديو من {start_time}s إلى {end_time}s...")
        
        cmd = [
            'ffmpeg', '-i', input_path,
            '-ss', str(start_time),
            '-t', str(duration),
            '-c', 'copy',  # نسخ بدون إعادة ترميز (أسرع)
            '-y', output_path
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if os.path.exists(output_path):
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': os.path.getsize(output_path),
                'duration': duration,
                'start_time': start_time,
                'end_time': end_time
            }
        else:
            raise Exception("فشل قص الفيديو")
            
    except Exception as e:
        print(f"خطأ في قص الفيديو: {e}")
        raise


def trim_audio(input_path, output_folder, start_time, end_time, output_format='mp3'):
    """
    قص الملف الصوتي (اختيار جزء معين)
    
    Args:
        input_path: مسار الملف الصوتي المدخل
        output_folder: مجلد حفظ الملف المقصوص
        start_time: وقت البداية بالثواني
        end_time: وقت النهاية بالثواني
        output_format: صيغة الملف الناتج
    
    Returns:
        dict: معلومات الملف المقصوص
    """
    try:
        os.makedirs(output_folder, exist_ok=True)
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_filename = f"{base_name}_trimmed.{output_format}"
        output_path = os.path.join(output_folder, output_filename)
        
        duration = end_time - start_time
        
        print(f"جاري قص الصوت من {start_time}s إلى {end_time}s...")
        
        cmd = [
            'ffmpeg', '-i', input_path,
            '-ss', str(start_time),
            '-t', str(duration),
            '-c', 'copy',
            '-y', output_path
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        if os.path.exists(output_path):
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': os.path.getsize(output_path),
                'duration': duration,
                'start_time': start_time,
                'end_time': end_time,
                'format': output_format
            }
        else:
            raise Exception("فشل قص الصوت")
            
    except Exception as e:
        print(f"خطأ في قص الصوت: {e}")
        raise


def merge_audio_files(input_paths, output_folder, output_format='mp3'):
    """
    دمج عدة ملفات صوتية في ملف واحد
    
    Args:
        input_paths: قائمة بمسارات الملفات الصوتية
        output_folder: مجلد حفظ الملف المدموج
        output_format: صيغة الملف الناتج
    
    Returns:
        dict: معلومات الملف المدموج
    """
    try:
        os.makedirs(output_folder, exist_ok=True)
        
        output_filename = f"merged_audio.{output_format}"
        output_path = os.path.join(output_folder, output_filename)
        
        # إنشاء ملف قائمة للدمج
        list_file = os.path.join(output_folder, 'merge_list.txt')
        with open(list_file, 'w') as f:
            for path in input_paths:
                f.write(f"file '{path}'\n")
        
        print(f"جاري دمج {len(input_paths)} ملفات صوتية...")
        
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', list_file,
            '-c', 'copy',
            '-y', output_path
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # حذف ملف القائمة المؤقت
        if os.path.exists(list_file):
            os.remove(list_file)
        
        if os.path.exists(output_path):
            total_duration = sum([get_audio_duration(p) for p in input_paths])
            
            return {
                'success': True,
                'filename': output_filename,
                'path': output_path,
                'size': os.path.getsize(output_path),
                'duration': total_duration,
                'files_count': len(input_paths),
                'format': output_format
            }
        else:
            raise Exception("فشل دمج الملفات الصوتية")
            
    except Exception as e:
        print(f"خطأ في دمج الصوت: {e}")
        raise
