// ===== AdSense Ads Manager =====
// هذا الملف يدير عرض الإعلانات في الأوقات المناسبة

class AdsManager {
    constructor() {
        this.interstitialShown = false;
        this.lastInterstitialTime = 0;
        this.minTimeBetweenAds = 30000; // 30 ثانية بين الإعلانات
    }

    // عرض إعلان Interstitial
    showInterstitialAd(callback) {
        const now = Date.now();
        
        // التحقق من الوقت بين الإعلانات
        if (now - this.lastInterstitialTime < this.minTimeBetweenAds) {
            if (callback) callback();
            return;
        }

        this.lastInterstitialTime = now;

        // إنشاء overlay للإعلان
        const overlay = document.createElement('div');
        overlay.className = 'ad-interstitial-overlay';
        overlay.innerHTML = `
            <div class="ad-interstitial-container">
                <div class="ad-interstitial-header">
                    <span class="ad-timer">سيتم التحميل خلال <span id="adTimer">5</span> ثواني...</span>
                    <button class="ad-close-btn" id="adCloseBtn" disabled>✕</button>
                </div>
                <div class="ad-interstitial-content">
                    <!-- AdSense Interstitial Ad Code Here -->
                    <div class="ad-placeholder-interstitial">
                        <h3>إعلان</h3>
                        <p>ضع كود AdSense هنا</p>
                        <p style="font-size: 0.9em; margin-top: 10px;">سيتم إغلاق الإعلان تلقائياً بعد 5 ثواني</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);

        // مؤقت للعد التنازلي
        let timeLeft = 5;
        const timerElement = document.getElementById('adTimer');
        const closeBtn = document.getElementById('adCloseBtn');
        
        const countdown = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(countdown);
                closeBtn.disabled = false;
                closeBtn.textContent = 'إغلاق الإعلان';
                timerElement.textContent = '';
                timerElement.parentElement.textContent = 'يمكنك الإغلاق الآن';
            }
        }, 1000);

        // إغلاق الإعلان
        const closeAd = () => {
            overlay.remove();
            if (callback) callback();
        };

        closeBtn.addEventListener('click', closeAd);
        
        // إغلاق تلقائي بعد 10 ثواني
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                closeAd();
            }
        }, 10000);
    }

    // عرض إعلان للمشاركة
    showShareAd(callback) {
        this.showInterstitialAd(callback);
    }

    // تحميل إعلانات الشريط الجانبي
    initializeSidebarAds() {
        // سيتم تحميل إعلانات AdSense هنا
        console.log('📢 Sidebar ads initialized');
    }

    // تحميل الإعلان الشريطي الثابت
    initializeStickyBanner() {
        // سيتم تحميل إعلان AdSense هنا
        console.log('📢 Sticky banner ad initialized');
    }
}

// إنشاء instance عام
const adsManager = new AdsManager();

// تهيئة الإعلانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    adsManager.initializeSidebarAds();
    adsManager.initializeStickyBanner();
});
