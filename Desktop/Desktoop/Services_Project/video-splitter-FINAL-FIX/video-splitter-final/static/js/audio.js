// ===== Global Variables =====
let uploadedFile = null;
let uploadedFileName = '';
let selectedFormat = 'mp3';
let currentFormat = '';
let isVideo = false;

// ===== DOM Elements =====
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileType = document.getElementById('fileType');
const currentFormatEl = document.getElementById('currentFormat');
const fileSize = document.getElementById('fileSize');
const convertCard = document.getElementById('convertCard');
const convertBtn = document.getElementById('convertBtn');
const convertBtnIcon = document.getElementById('convertBtnIcon');
const convertBtnText = document.getElementById('convertBtnText');
const formatBtns = document.querySelectorAll('.format-btn');
const qualitySelect = document.getElementById('quality');
const progressCard = document.getElementById('progressCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressStatus = document.getElementById('progressStatus');
const resultsCard = document.getElementById('resultsCard');
const resultsTitle = document.getElementById('resultsTitle');
const resultSingle = document.getElementById('resultSingle');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// ===== Event Listeners =====

// Upload area click
uploadArea.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'BUTTON') {
        fileInput.click();
    }
});

// File input change
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Format buttons
formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.dataset.format;
        
        // تفعيل زر التحويل
        convertBtn.disabled = false;
    });
});

// Convert button
convertBtn.addEventListener('click', startConversion);

// Reset button
resetBtn.addEventListener('click', resetPage);

// ===== Functions =====

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Check file type
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 
                       'audio/flac', 'audio/x-m4a', 'audio/mp4'];
    const videoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 
                       'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'video/webm'];
    
    const isAudio = audioTypes.includes(file.type) || file.name.match(/\.(mp3|wav|aac|ogg|flac|m4a)$/i);
    isVideo = videoTypes.includes(file.type) || file.name.match(/\.(mp4|avi|mov|mkv|flv|wmv|webm)$/i);
    
    if (!isAudio && !isVideo) {
        alert('❌ نوع الملف غير مدعوم! الرجاء اختيار ملف صوت أو فيديو.');
        return;
    }
    
    // Check file size (500 MB max)
    if (file.size > 524288000) {
        alert('❌ حجم الملف كبير جداً! الحد الأقصى 500 ميجابايت.');
        return;
    }
    
    uploadedFile = file;
    uploadedFileName = file.name;
    
    // Get current format
    const ext = file.name.split('.').pop().toLowerCase();
    currentFormat = ext;
    
    // Display file info
    displayFileInfo(file, isVideo);
    
    // Show convert card
    convertCard.style.display = 'block';
    
    // Update button text based on file type
    if (isVideo) {
        convertBtnIcon.textContent = '🎵';
        convertBtnText.textContent = 'استخرج وحول الصوت';
    } else {
        convertBtnIcon.textContent = '🔄';
        convertBtnText.textContent = 'ابدأ التحويل';
    }
    
    // Select MP3 by default
    formatBtns[0].classList.add('active');
    selectedFormat = 'mp3';
    
    // Smooth scroll to convert card
    convertCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayFileInfo(file, isVideoFile) {
    fileName.textContent = file.name;
    fileType.textContent = isVideoFile ? '🎬 فيديو' : '🎵 صوت';
    currentFormatEl.textContent = currentFormat.toUpperCase();
    fileSize.textContent = formatFileSize(file.size);
    
    fileInfo.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' كيلوبايت';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' ميجابايت';
    return (bytes / 1073741824).toFixed(2) + ' جيجابايت';
}

async function startConversion() {
    if (!uploadedFile) {
        alert('❌ الرجاء اختيار ملف أولاً!');
        return;
    }
    
    if (!selectedFormat) {
        alert('❌ الرجاء اختيار الصيغة المطلوبة!');
        return;
    }
    
    // عرض إعلان قبل بدء التحويل
    adsManager.showInterstitialAd(async () => {
        const quality = qualitySelect.value;
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        try {
            // Upload file
            const formData = new FormData();
            formData.append('video', uploadedFile);  // endpoint expects 'video'
            
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('فشل رفع الملف');
            }
            
            const uploadData = await uploadResponse.json();
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            // Show progress card
            progressCard.style.display = 'block';
            convertCard.style.display = 'none';
            progressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Simulate progress
            simulateProgress();
            
            // Start conversion
            const convertResponse = await fetch('/convert-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: uploadData.filename,
                    output_format: selectedFormat,
                    quality: quality
                })
            });
            
            if (!convertResponse.ok) {
                throw new Error('فشل معالجة الصوت');
            }
            
            const convertData = await convertResponse.json();
            
            if (!convertData.success) {
                throw new Error(convertData.error || 'فشل معالجة الصوت');
            }
            
            // Show results
            displayResults(convertData);
            
        } catch (error) {
            loadingOverlay.style.display = 'none';
            progressCard.style.display = 'none';
            alert('❌ حدث خطأ: ' + error.message);
            console.error(error);
        }
    });
}

async function simulateProgress() {
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
        const progress = Math.round((i / steps) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
        
        if (i === 0) {
            progressStatus.textContent = 'جاري تحليل الملف...';
        } else if (i < steps - 1) {
            if (isVideo) {
                progressStatus.textContent = `جاري استخراج الصوت...`;
            } else {
                progressStatus.textContent = `جاري التحويل إلى ${selectedFormat.toUpperCase()}...`;
            }
        } else {
            progressStatus.textContent = 'جاري إنهاء المعالجة...';
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

function displayResults(data) {
    progressCard.style.display = 'none';
    resultsCard.style.display = 'block';
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    const file = data.file;
    
    // Update title based on operation
    if (file.is_extracted) {
        resultsTitle.textContent = '✅ تم استخراج الصوت بنجاح!';
    } else {
        resultsTitle.textContent = '✅ اكتمل التحويل!';
    }
    
    resultSingle.innerHTML = `
        <div class="result-info-card">
            <div class="result-icon-large">${file.is_extracted ? '🎵' : '✅'}</div>
            <h3>${file.is_extracted ? 'تم استخراج الصوت من الفيديو' : 'تم تحويل الصوت بنجاح'}</h3>
            <div class="result-details">
                <div class="detail-row">
                    <span class="detail-label">📁 اسم الملف:</span>
                    <span class="detail-value">${file.filename}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📋 الصيغة:</span>
                    <span class="detail-value">${file.format.toUpperCase()}</span>
                </div>
                ${file.duration !== 'غير متاح' ? `
                <div class="detail-row">
                    <span class="detail-label">⏱️ المدة:</span>
                    <span class="detail-value">${file.duration}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">📏 الحجم:</span>
                    <span class="detail-value">${file.size}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🎯 الجودة:</span>
                    <span class="detail-value">${getQualityName(file.quality)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Set download button action
    downloadBtn.onclick = () => {
        // عرض إعلان قبل التحميل
        adsManager.showInterstitialAd(() => {
            window.location.href = file.download_url;
        });
    };
}

function getQualityName(quality) {
    const names = {
        'low': 'منخفضة (96 kbps)',
        'medium': 'متوسطة (128 kbps)',
        'high': 'عالية (192 kbps)',
        'best': 'الأفضل (320 kbps)'
    };
    return names[quality] || quality;
}

function resetPage() {
    location.reload();
}

// ===== Initialize =====
console.log('🎵 Audio Converter Ready!');
