const CACHE_NAME = 'quail-village-v3.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './images/logoseman.png'
];

// التثبيت الأولي للسيرفس وركر
self.addEventListener('install', (event) => {
    self.skipWaiting(); // التفعيل الفوري دون الانتظار
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// التنشيط والتنظيف الذاتي للكاش القديم عند رفع تحديث جديد
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // حذف النسخ القديمة كلياً
                    }
                })
            );
        }).then(() => self.clients.claim()) // الاستحواذ الفوري على كافة صفحات الأبلكيشن
    );
});

// التعامل مع الطلبات: Network-First للـ HTML والشيت، لضمان استلام أحدث التعديلات فوراً
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // إذا كان الطلب لملف الصفحة الرئيسية أو كود الشيت
    if (event.request.mode === 'navigate' || requestUrl.href.includes('docs.google.com')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => caches.match(event.request)) // في حالة انقطاع النت يتم جلب آخر نسخة محفوظة
        );
        return;
    }

    // بقية الصور والملفات الثابتة جلب سريع من الكاش
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // تحديث الكاش بالخلفية للصور والملفات
                fetch(event.request).then((networkResponse) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse);
                    });
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});

// الاستجابة لأمر التحديث المباشر من index.html
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
