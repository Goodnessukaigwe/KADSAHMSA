// KADSAMHSA mobile navigation enhancements.
define([], function() {
    return {
        init: function() {
            var toggler = document.querySelector('[data-target="theme_boost-drawers-primary"]');
            if (!toggler) {
                return;
            }
            toggler.addEventListener('click', function() {
                var expanded = toggler.getAttribute('aria-expanded') === 'true';
                toggler.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            });
        }
    };
});
