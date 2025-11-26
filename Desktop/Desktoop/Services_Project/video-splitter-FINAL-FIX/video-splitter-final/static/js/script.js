// ===== Global Variables =====
let uploadedFile = null;
let videoDuration = 0;
let uploadedFileName = '';
let downloadedFiles = []; // قائمة الملفات المقسمة

// ===== DOM Elements =====
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const videoInfo = document.getElementById('videoInfo');
const fileName = document.getElementById('fileName');
const videoDurationEl = document.getElementById('videoDuration');
const fileSize = document.getElementById('fileSize');
const splitCard = document.getElementById('splitCard');
const numPartsInput = document.getElementById('numParts');
const partDuration = document.getElementById('partDuration');
const decreaseBtn = document.getElementById('decreaseBtn');
const increaseBtn = document.getElementById('increaseBtn');
const splitBtn = document.getElementById('splitBtn');
const enableOverlap = document.getElementById('enableOverlap');
const overlapSettings = document.getElementById('overlapSettings');
const overlapSeconds = document.getElementById('overlapSeconds');
const overlapDisplay = document.getElementById('overlapDisplay');
const decreaseOverlapBtn = document.getElementById('decreaseOverlapBtn');
const increaseOverlapBtn = document.getElementById('increaseOverlapBtn');
const progressCard = document.getElementById('progressCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressStatus = document.getElementById('progressStatus');
const resultsCard = document.getElementById('resultsCard');
const resultsGrid = document.getElementById('resultsGrid');
const resetBtn = document.getElementById('resetBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// ===== Event Listeners =====

// Upload area click
uploadArea.addEventListener('click', (e) => {
    // تجنب النقر المزدوج عند الضغط على الزر
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'BUTTON') {
        videoInput.click();
    }
});

// File input change
videoInput.addEventListener('change', handleFileSelect);

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

// Counter buttons
decreaseBtn.addEventListener('click', () => {
    if (numPartsInput.value > 2) {
        numPartsInput.value = parseInt(numPartsInput.value) - 1;
        updatePartDuration();
    }
});

increaseBtn.addEventListener('click', () => {
    if (numPartsInput.value < 20) {
        numPartsInput.value = parseInt(numPartsInput.value) + 1;
        updatePartDuration();
    }
});

numPartsInput.addEventListener('input', updatePartDuration);

// Overlap controls
enableOverlap.addEventListener('change', () => {
    if (enableOverlap.checked) {
        overlapSettings.style.display = 'block';
    } else {
        overlapSettings.style.display = 'none';
    }
});

decreaseOverlapBtn.addEventListener('click', () => {
    if (overlapSeconds.value > 1) {
        overlapSeconds.value = parseInt(overlapSeconds.value) - 1;
        overlapDisplay.textContent = overlapSeconds.value;
    }
});

increaseOverlapBtn.addEventListener('click', () => {
    if (overlapSeconds.value < 30) {
        overlapSeconds.value = parseInt(overlapSeconds.value) + 1;
        overlapDisplay.textContent = overlapSeconds.value;
    }
});

overlapSeconds.addEventListener('input', () => {
    overlapDisplay.textContent = overlapSeconds.value;
});

// Split button
splitBtn.addEventListener('click', startSplitting);

// Reset button
resetBtn.addEventListener('click', resetPage);

// Download all button
downloadAllBtn.addEventListener('click', downloadAllFiles);

// ===== Functions =====

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Check file type
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 
                       'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv', 'video/webm'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|mkv|flv|wmv|webm)$/i)) {
        alert('❌ صيغة الملف غير مدعومة! الرجاء اختيار ملف فيديو صالح.');
        return;
    }
    
    // Check file size (500 MB max)
    if (file.size > 524288000) {
        alert('❌ حجم الملف كبير جداً! الحد الأقصى 500 ميجابايت.');
        return;
    }
    
    uploadedFile = file;
    
    // Get video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        videoDuration = video.duration;
        
        // Display file info
        displayFileInfo(file, videoDuration);
        
        // Show split card
        splitCard.style.display = 'block';
        updatePartDuration();
        
        // Smooth scroll to split card
        splitCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    
    video.src = URL.createObjectURL(file);
}

function displayFileInfo(file, duration) {
    fileName.textContent = file.name;
    videoDurationEl.textContent = formatDuration(duration);
    fileSize.textContent = formatFileSize(file.size);
    uploadedFileName = file.name;
    
    videoInfo.style.display = 'block';
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' كيلوبايت';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' ميجابايت';
    return (bytes / 1073741824).toFixed(2) + ' جيجابايت';
}

function updatePartDuration() {
    const numParts = parseInt(numPartsInput.value);
    if (videoDuration > 0 && numParts > 0) {
        const partDurationSeconds = videoDuration / numParts;
        partDuration.textContent = formatDuration(partDurationSeconds);
    }
}

async function startSplitting() {
    if (!uploadedFile) {
        alert('❌ الرجاء اختيار ملف فيديو أولاً!');
        return;
    }
    
    const numParts = parseInt(numPartsInput.value);
    
    if (numParts < 2 || numParts > 20) {
        alert('❌ الرجاء اختيار عدد أجزاء بين 2 و 20!');
        return;
    }
    
    // Get overlap settings
    const useOverlap = enableOverlap.checked;
    const overlap = useOverlap ? parseInt(overlapSeconds.value) : 0;
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    
    try {
        // Upload file
        const formData = new FormData();
        formData.append('video', uploadedFile);
        
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
        splitCard.style.display = 'none';
        progressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Start splitting with overlap parameter
        const splitResponse = await fetch('/split', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: uploadData.filename,
                num_parts: numParts,
                overlap_seconds: overlap
            })
        });
        
        if (!splitResponse.ok) {
            throw new Error('فشل تقسيم الفيديو');
        }
        
        const splitData = await splitResponse.json();
        
        if (!splitData.success) {
            throw new Error(splitData.error || 'فشل تقسيم الفيديو');
        }
        
        // Simulate progress
        await simulateProgress();
        
        // Show results with real data
        displayResults(splitData);
        
    } catch (error) {
        loadingOverlay.style.display = 'none';
        progressCard.style.display = 'none';
        alert('❌ حدث خطأ: ' + error.message);
        console.error(error);
    }
}

async function simulateProgress() {
    const numParts = parseInt(numPartsInput.value);
    const totalSteps = numParts + 2; // Analysis + split parts + finalization
    
    for (let i = 0; i <= totalSteps; i++) {
        const progress = Math.round((i / totalSteps) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
        
        if (i === 0) {
            progressStatus.textContent = 'جاري تحليل الفيديو...';
        } else if (i < totalSteps - 1) {
            progressStatus.textContent = `جاري تقسيم الجزء ${i} من ${numParts}...`;
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
    
    resultsGrid.innerHTML = '';
    downloadedFiles = []; // إعادة تعيين القائمة
    
    // Check if we have files from backend
    if (data.files && data.files.length > 0) {
        // Use real data from backend
        data.files.forEach(file => {
            downloadedFiles.push(file.filename); // حفظ اسم الملف
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-icon">🎬</div>
                <div class="result-name">${file.filename}</div>
                <div class="result-info">مدة: ${file.duration}</div>
                <div class="result-info">حجم: ${file.size}</div>
                <div class="result-actions">
                    <button class="btn btn-primary btn-small" onclick="downloadPart('${file.filename}')">
                        📥 تحميل
                    </button>
                </div>
                <div class="share-section">
                    <p class="share-label">مشاركة على:</p>
                    <div class="share-buttons">
                        <button class="btn-share btn-whatsapp" onclick="shareToWhatsApp('${file.filename}')" title="واتساب">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-telegram" onclick="shareToTelegram('${file.filename}')" title="تليغرام">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-twitter" onclick="shareToTwitter('${file.filename}')" title="X (تويتر)">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-snapchat" onclick="shareToSnapchat('${file.filename}')" title="سناب شات">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868.304.534.779 1.035 1.468 1.561 1.394.987 1.685 1.575 1.745 1.77.015.08.015.149 0 .209-.031.094-.16.269-.645.269h-.003c-.72 0-1.355-.209-1.726-.42-.199-.104-.494-.223-.659-.223-.219 0-.405.104-.645.27-.359.314-1.033.764-2.353.764-1.019 0-1.685-.3-2.353-.61-.51-.239-1.139-.629-1.907-.629-.784 0-1.413.39-1.922.629-.704.299-1.335.61-2.369.61-1.275 0-1.964-.449-2.323-.764-.27-.18-.464-.27-.644-.27-.165 0-.465.119-.675.224-.359.194-.989.419-1.714.419-.209 0-.405-.014-.599-.074-.224-.076-.16-.239-.314-.359-.12-.104-.374-.224-.374-.524 0-.104.074-.224.209-.359.254-.329.629-.629 1.19-1.093.719-.539 1.185-1.080 1.469-1.618.18-.345.209-.645.12-.869-.195-.434-.884-.659-1.469-.854-.135-.044-.254-.09-.359-.119-.779-.314-1.213-.704-1.213-1.168 0-.359.285-.689.734-.838.15-.061.327-.09.509-.09.12 0 .299.016.464.104.375.181.734.285 1.034.301.195 0 .327-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847 1.583-3.545 4.94-3.821 5.93-3.821l.036.001z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-tiktok" onclick="shareToTikTok('${file.filename}')" title="تيك توك">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            resultsGrid.appendChild(resultItem);
        });
    } else {
        // Fallback to placeholder (if backend didn't return files)
        const numParts = parseInt(numPartsInput.value);
        const baseName = uploadedFileName.replace(/\.[^/.]+$/, '');
        
        for (let i = 1; i <= numParts; i++) {
            const filename = `${baseName}_part${i}.mp4`;
            downloadedFiles.push(filename); // حفظ اسم الملف
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-icon">🎬</div>
                <div class="result-name">${filename}</div>
                <div class="result-info">مدة: ${formatDuration(videoDuration / numParts)}</div>
                <div class="result-actions">
                    <button class="btn btn-primary btn-small" onclick="downloadPart('${filename}')">
                        📥 تحميل
                    </button>
                </div>
                <div class="share-section">
                    <p class="share-label">مشاركة على:</p>
                    <div class="share-buttons">
                        <button class="btn-share btn-whatsapp" onclick="shareToWhatsApp('${filename}')" title="واتساب">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-telegram" onclick="shareToTelegram('${filename}')" title="تليغرام">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-twitter" onclick="shareToTwitter('${filename}')" title="X (تويتر)">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-snapchat" onclick="shareToSnapchat('${filename}')" title="سناب شات">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868.304.534.779 1.035 1.468 1.561 1.394.987 1.685 1.575 1.745 1.77.015.08.015.149 0 .209-.031.094-.16.269-.645.269h-.003c-.72 0-1.355-.209-1.726-.42-.199-.104-.494-.223-.659-.223-.219 0-.405.104-.645.27-.359.314-1.033.764-2.353.764-1.019 0-1.685-.3-2.353-.61-.51-.239-1.139-.629-1.907-.629-.784 0-1.413.39-1.922.629-.704.299-1.335.61-2.369.61-1.275 0-1.964-.449-2.323-.764-.27-.18-.464-.27-.644-.27-.165 0-.465.119-.675.224-.359.194-.989.419-1.714.419-.209 0-.405-.014-.599-.074-.224-.076-.16-.239-.314-.359-.12-.104-.374-.224-.374-.524 0-.104.074-.224.209-.359.254-.329.629-.629 1.19-1.093.719-.539 1.185-1.080 1.469-1.618.18-.345.209-.645.12-.869-.195-.434-.884-.659-1.469-.854-.135-.044-.254-.09-.359-.119-.779-.314-1.213-.704-1.213-1.168 0-.359.285-.689.734-.838.15-.061.327-.09.509-.09.12 0 .299.016.464.104.375.181.734.285 1.034.301.195 0 .327-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847 1.583-3.545 4.94-3.821 5.93-3.821l.036.001z"/>
                            </svg>
                        </button>
                        <button class="btn-share btn-tiktok" onclick="shareToTikTok('${filename}')" title="تيك توك">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            resultsGrid.appendChild(resultItem);
        }
    }
}

async function downloadAllFiles() {
    if (downloadedFiles.length === 0) {
        alert('❌ لا توجد ملفات للتحميل!');
        return;
    }
    
    // عرض إعلان قبل التحميل
    adsManager.showInterstitialAd(async () => {
        try {
            // إظهار شاشة التحميل
            loadingOverlay.style.display = 'flex';
            loadingOverlay.querySelector('p').textContent = 'جاري تجهيز الملفات للتحميل...';
            
            const response = await fetch('/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: downloadedFiles
                })
            });
            
            if (!response.ok) {
                throw new Error('فشل تحميل الملفات');
            }
            
            // تحويل الاستجابة إلى blob
            const blob = await response.blob();
            
            // إنشاء رابط تحميل
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'video_parts.zip';
            document.body.appendChild(a);
            a.click();
            
            // تنظيف
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            loadingOverlay.style.display = 'none';
            
            // رسالة نجاح
            alert('✅ تم تحميل جميع الملفات بنجاح!');
            
        } catch (error) {
            loadingOverlay.style.display = 'none';
            alert('❌ حدث خطأ: ' + error.message);
            console.error(error);
        }
    });
}

function downloadPart(filename) {
    // عرض إعلان قبل تحميل الملف
    adsManager.showInterstitialAd(() => {
        window.location.href = `/download/${filename}`;
    });
}

function resetPage() {
    location.reload();
}

// ===== Share Functions =====

function shareToWhatsApp(filename) {
    adsManager.showShareAd(() => {
        const url = `${window.location.origin}/download/${filename}`;
        const text = `شاهد هذا المقطع: ${filename}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
        window.open(whatsappUrl, '_blank');
    });
}

function shareToTelegram(filename) {
    adsManager.showShareAd(() => {
        const url = `${window.location.origin}/download/${filename}`;
        const text = `شاهد هذا المقطع: ${filename}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(telegramUrl, '_blank');
    });
}

function shareToTwitter(filename) {
    adsManager.showShareAd(() => {
        const url = `${window.location.origin}/download/${filename}`;
        const text = `شاهد هذا المقطع: ${filename}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    });
}

function shareToSnapchat(filename) {
    adsManager.showShareAd(() => {
        // Snapchat doesn't have a direct web sharing URL
        // So we'll copy the link and show a message
        const url = `${window.location.origin}/download/${filename}`;
        copyToClipboard(url);
        alert('📋 تم نسخ الرابط!\n\nالآن افتح سناب شات وشارك الرابط في رسالة أو قصة.');
    });
}

function shareToTikTok(filename) {
    adsManager.showShareAd(() => {
        // TikTok doesn't have a direct web sharing URL for external videos
        // So we'll copy the link and show a message
        const url = `${window.location.origin}/download/${filename}`;
        copyToClipboard(url);
        alert('📋 تم نسخ الرابط!\n\nيمكنك تحميل المقطع أولاً ثم رفعه على تيك توك.');
    });
}

function copyToClipboard(text) {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Failed to copy:', err);
    }
    
    document.body.removeChild(textarea);
}

// ===== Initialize =====
console.log('🎬 Video Splitter Ready!');
