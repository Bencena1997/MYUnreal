import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-me'
    
    # حجم أقصى للملف (500 ميجابايت)
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 524288000))
    
    # مجلدات التخزين
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
    OUTPUT_FOLDER = os.environ.get('OUTPUT_FOLDER', 'static/outputs')
    
    # صيغ الفيديو المسموحة
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'}
    
    # إعدادات التنظيف التلقائي
    AUTO_DELETE_AFTER_MINUTES = 30
