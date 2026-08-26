// KADSAMHSA theme AMD loader — initializes theme JS modules.
define(['theme_kadsamhsa/lazyload', 'theme_kadsamhsa/mobile-nav'], function(Lazyload, MobileNav) {
    return {
        init: function() {
            Lazyload.init();
            MobileNav.init();
            if (document.body.classList.contains('kadsamhsa-catalogue')) {
                require(['theme_kadsamhsa/catalogue'], function(Catalogue) {
                    Catalogue.init();
                });
            }
        }
    };
});
