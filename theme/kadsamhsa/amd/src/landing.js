// KADSAMHSA landing page — mobile nav toggle.
define([], function() {
    return {
        init: function() {
            var toggle = document.querySelector('[data-action="toggle-landing-nav"]');
            var menu = document.getElementById('kadsamhsa-landing-nav-menu');
            if (!toggle || !menu) {
                return;
            }

            toggle.addEventListener('click', function() {
                var expanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                menu.classList.toggle('is-open', !expanded);
            });
        }
    };
});
