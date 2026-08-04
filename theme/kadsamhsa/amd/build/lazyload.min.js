// KADSAMHSA lazy-load images for low-bandwidth.
define([], function() {
    return {
        init: function() {
            if (!('loading' in HTMLImageElement.prototype)) {
                var images = document.querySelectorAll('img[loading="lazy"]');
                if ('IntersectionObserver' in window) {
                    var observer = new IntersectionObserver(function(entries) {
                        entries.forEach(function(entry) {
                            if (entry.isIntersecting) {
                                var img = entry.target;
                                if (img.dataset.src) {
                                    img.src = img.dataset.src;
                                }
                                observer.unobserve(img);
                            }
                        });
                    });
                    images.forEach(function(img) {
                        observer.observe(img);
                    });
                }
            }
        }
    };
});
