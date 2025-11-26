from flask import Flask, render_template, request, jsonify, send_file, url_for
import os
from config import Config
from werkzeug.utils import secure_filename
import json
import zipfile
import tempfile
from video_utils import (
    split_video as split_video_util, 
    get_video_duration, 
    format_duration, 
    format_file_size,
    convert_video_format,
    convert_audio_format,
    compress_video,
    trim_video,
    trim_audio,
    merge_audio_files
)

app = Flask(__name__)
app.config.from_object(Config)

# إنشاء المجلدات إذا لم تكن موجودة
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """التحقق من صيغة الملف"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return render_template('index.html')


@app.route('/privacy')
def privacy():
    """صفحة سياسة الخصوصية"""
    return render_template('privacy.html')


@app.route('/terms')
def terms():
    """صفحة شروط الاستخدام"""
    return render_template('terms.html')


@app.route('/about')
def about():
    """صفحة من نحن"""
    return render_template('about.html')


@app.route('/convert')
def convert_page():
    """صفحة تحويل صيغ الفيديو"""
    return render_template('convert.html')


@app.route('/audio')
def audio_page():
    """صفحة تحويل واستخراج الصوت"""
    return render_template('audio.html')


@app.route('/convert-audio', methods=['POST'])
def convert_audio():
    """تحويل صيغة الصوت أو استخراج الصوت من الفيديو"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        output_format = data.get('output_format', 'mp3')
        quality = data.get('quality', 'medium')
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        # الصيغ المدعومة
        supported_formats = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a']
        if output_format.lower() not in supported_formats:
            return jsonify({'error': f'الصيغة {output_format} غير مدعومة'}), 400
        
        # مسار الملف المدخل
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        # تحويل/استخراج الصوت
        result = convert_audio_format(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            output_format=output_format,
            quality=quality
        )
        
        if result['success']:
            action = "استخراج" if result['is_extracted'] else "تحويل"
            return jsonify({
                'success': True,
                'message': f'تم {action} الصوت بنجاح إلى {output_format.upper()}',
                'file': {
                    'filename': result['filename'],
                    'format': result['format'],
                    'quality': result['quality'],
                    'duration': format_duration(result['duration']) if result['duration'] > 0 else 'غير متاح',
                    'size': format_file_size(result['size']),
                    'is_extracted': result['is_extracted'],
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل معالجة الصوت'}), 500
    
    except Exception as e:
        print(f"خطأ في معالجة الصوت: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/compress-video', methods=['POST'])
def compress_video_endpoint():
    """ضغط الفيديو"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        compression_level = data.get('compression_level', 'medium')
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        result = compress_video(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            compression_level=compression_level
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'تم ضغط الفيديو بنجاح',
                'file': {
                    'filename': result['filename'],
                    'duration': format_duration(result['duration']),
                    'size': format_file_size(result['size']),
                    'original_size': format_file_size(result['original_size']),
                    'reduction_percent': round(result['reduction_percent'], 1),
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل ضغط الفيديو'}), 500
    
    except Exception as e:
        print(f"خطأ في ضغط الفيديو: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/trim-video', methods=['POST'])
def trim_video_endpoint():
    """قص الفيديو"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        start_time = float(data.get('start_time', 0))
        end_time = float(data.get('end_time', 0))
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        if end_time <= start_time:
            return jsonify({'error': 'وقت النهاية يجب أن يكون أكبر من وقت البداية'}), 400
        
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        result = trim_video(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            start_time=start_time,
            end_time=end_time
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'تم قص الفيديو بنجاح',
                'file': {
                    'filename': result['filename'],
                    'duration': format_duration(result['duration']),
                    'size': format_file_size(result['size']),
                    'start_time': format_duration(result['start_time']),
                    'end_time': format_duration(result['end_time']),
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل قص الفيديو'}), 500
    
    except Exception as e:
        print(f"خطأ في قص الفيديو: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/trim-audio', methods=['POST'])
def trim_audio_endpoint():
    """قص الصوت"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        start_time = float(data.get('start_time', 0))
        end_time = float(data.get('end_time', 0))
        output_format = data.get('output_format', 'mp3')
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        if end_time <= start_time:
            return jsonify({'error': 'وقت النهاية يجب أن يكون أكبر من وقت البداية'}), 400
        
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        result = trim_audio(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            start_time=start_time,
            end_time=end_time,
            output_format=output_format
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'تم قص الصوت بنجاح',
                'file': {
                    'filename': result['filename'],
                    'duration': format_duration(result['duration']),
                    'size': format_file_size(result['size']),
                    'start_time': format_duration(result['start_time']),
                    'end_time': format_duration(result['end_time']),
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل قص الصوت'}), 500
    
    except Exception as e:
        print(f"خطأ في قص الصوت: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/merge-audio', methods=['POST'])
def merge_audio_endpoint():
    """دمج ملفات صوتية"""
    try:
        # استقبال عدة ملفات
        files = request.files.getlist('audio_files')
        output_format = request.form.get('output_format', 'mp3')
        
        if len(files) < 2:
            return jsonify({'error': 'يجب رفع ملفين صوتيين على الأقل'}), 400
        
        # حفظ الملفات مؤقتاً
        temp_paths = []
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                temp_paths.append(filepath)
        
        if len(temp_paths) < 2:
            return jsonify({'error': 'فشل رفع الملفات'}), 400
        
        # دمج الملفات
        result = merge_audio_files(
            input_paths=temp_paths,
            output_folder=app.config['OUTPUT_FOLDER'],
            output_format=output_format
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'تم دمج {result["files_count"]} ملفات صوتية بنجاح',
                'file': {
                    'filename': result['filename'],
                    'duration': format_duration(result['duration']),
                    'size': format_file_size(result['size']),
                    'files_count': result['files_count'],
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل دمج الملفات الصوتية'}), 500
    
    except Exception as e:
        print(f"خطأ في دمج الصوت: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/convert-video', methods=['POST'])
def convert_video():
    """تحويل صيغة الفيديو"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        output_format = data.get('output_format', 'mp4')
        quality = data.get('quality', 'medium')
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        # الصيغ المدعومة
        supported_formats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv']
        if output_format.lower() not in supported_formats:
            return jsonify({'error': f'الصيغة {output_format} غير مدعومة'}), 400
        
        # مسار الملف المدخل
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        # تحويل الفيديو
        result = convert_video_format(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            output_format=output_format,
            quality=quality
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'تم تحويل الفيديو بنجاح إلى {output_format.upper()}',
                'file': {
                    'filename': result['filename'],
                    'format': result['format'],
                    'quality': result['quality'],
                    'duration': format_duration(result['duration']),
                    'size': format_file_size(result['size']),
                    'download_url': url_for('download_file', filename=result['filename'])
                }
            })
        else:
            return jsonify({'error': 'فشل تحويل الفيديو'}), 500
    
    except Exception as e:
        print(f"خطأ في تحويل الفيديو: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/upload', methods=['POST'])
def upload_video():
    """رفع الفيديو"""
    try:
        # التحقق من وجود الملف
        if 'video' not in request.files:
            return jsonify({'error': 'لم يتم اختيار ملف'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'لم يتم اختيار ملف'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'صيغة الملف غير مدعومة'}), 400
        
        # حفظ الملف
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # الحصول على معلومات الفيديو
        try:
            duration = get_video_duration(filepath)
            duration_formatted = format_duration(duration)
        except:
            duration = 0
            duration_formatted = "غير معروف"
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath,
            'duration': duration,
            'duration_formatted': duration_formatted
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/split', methods=['POST'])
def split_video():
    """تقسيم الفيديو"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        num_parts = int(data.get('num_parts', 2))
        overlap_seconds = int(data.get('overlap_seconds', 0))
        
        if not filename:
            return jsonify({'error': 'اسم الملف مطلوب'}), 400
        
        if num_parts < 2 or num_parts > 20:
            return jsonify({'error': 'عدد الأجزاء يجب أن يكون بين 2 و 20'}), 400
        
        if overlap_seconds < 0 or overlap_seconds > 30:
            return jsonify({'error': 'التداخل يجب أن يكون بين 0 و 30 ثانية'}), 400
        
        # مسار الملف المدخل
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        # الاسم الأساسي بدون الامتداد
        base_filename = os.path.splitext(filename)[0]
        
        # تقسيم الفيديو مع التداخل
        output_files = split_video_util(
            input_path=input_path,
            output_folder=app.config['OUTPUT_FOLDER'],
            num_parts=num_parts,
            base_filename=base_filename,
            overlap_seconds=overlap_seconds
        )
        
        # تنسيق النتائج للإرجاع
        results = []
        for file_info in output_files:
            results.append({
                'filename': file_info['filename'],
                'part_number': file_info['part_number'],
                'duration': format_duration(file_info['duration']),
                'size': format_file_size(file_info['size']),
                'download_url': url_for('download_file', filename=file_info['filename'])
            })
        
        message = f'تم تقسيم الفيديو بنجاح إلى {num_parts} أجزاء'
        if overlap_seconds > 0:
            message += f' مع تداخل {overlap_seconds} ثانية'
        
        return jsonify({
            'success': True,
            'message': message,
            'files': results
        })
    
    except Exception as e:
        print(f"خطأ في تقسيم الفيديو: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/download/<filename>')
def download_file(filename):
    """تحميل ملف"""
    try:
        filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'الملف غير موجود'}), 404
        
        return send_file(filepath, as_attachment=True)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/download-all', methods=['POST'])
def download_all():
    """تحميل جميع الأجزاء في ملف مضغوط واحد"""
    try:
        data = request.get_json()
        files = data.get('files', [])
        
        if not files:
            return jsonify({'error': 'لا توجد ملفات للتحميل'}), 400
        
        # إنشاء ملف مؤقت للـ zip
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        
        try:
            # إنشاء ملف ZIP
            with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for filename in files:
                    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
                    
                    if os.path.exists(filepath):
                        # إضافة الملف للـ ZIP
                        zipf.write(filepath, arcname=filename)
                    else:
                        print(f"تحذير: الملف غير موجود: {filename}")
            
            # إرسال ملف الـ ZIP
            return send_file(
                temp_zip.name,
                as_attachment=True,
                download_name='video_parts.zip',
                mimetype='application/zip'
            )
        
        finally:
            # حذف الملف المؤقت بعد الإرسال
            # Flask سيحذفه تلقائياً بعد إرسال الملف
            pass
    
    except Exception as e:
        print(f"خطأ في تحميل جميع الملفات: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
