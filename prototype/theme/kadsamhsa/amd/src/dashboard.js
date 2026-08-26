// KADSAMHSA student home — slide-in onboarding + course search filter.
define(['core/ajax'], function(Ajax) {
    var LEAVE_MS = 340;

    /**
     * Filter explore cards by search query.
     *
     * @param {HTMLElement} root
     */
    function applySearch(root) {
        var input = root.querySelector('[data-action="dash-search"]');
        var query = input ? input.value.trim().toLowerCase() : '';
        var cards = root.querySelectorAll('.kadsamhsa-shome-card');
        var empty = root.querySelector('[data-region="dash-empty"]');
        var visible = 0;

        cards.forEach(function(card) {
            var title = (card.getAttribute('data-title') || '').toLowerCase();
            var show = !query || title.indexOf(query) !== -1;
            card.hidden = !show;
            if (show) {
                visible += 1;
            }
        });

        if (empty) {
            empty.hidden = visible > 0;
        }
    }

    /**
     * Slide the onboarding card in after paint.
     *
     * @param {HTMLElement} modal
     */
    function showOnboarding(modal) {
        // Next frames so the browser applies the off-screen start state first.
        window.requestAnimationFrame(function() {
            window.requestAnimationFrame(function() {
                modal.classList.add('is-visible');
                modal.setAttribute('aria-hidden', 'false');
            });
        });
    }

    /**
     * Slide out, then remove and persist dismissal.
     *
     * @param {HTMLElement} modal
     */
    function dismissOnboarding(modal) {
        if (modal.classList.contains('is-leaving')) {
            return;
        }

        modal.classList.remove('is-visible');
        modal.classList.add('is-leaving');
        modal.setAttribute('aria-hidden', 'true');

        window.setTimeout(function() {
            modal.hidden = true;
            modal.classList.remove('is-leaving');
        }, LEAVE_MS);

        Ajax.call([{
            methodname: 'core_user_update_user_preferences',
            args: {
                preferences: [{
                    type: 'theme_kadsamhsa_dash_onboarding',
                    value: '1'
                }]
            }
        }])[0].catch(function() {
            // Preference write is best-effort; UI already dismissed.
        });
    }

    return {
        init: function() {
            var root = document.querySelector('[data-region="kadsamhsa-student-home"]');
            if (!root) {
                return;
            }

            var searchInput = root.querySelector('[data-action="dash-search"]');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    applySearch(root);
                });
            }

            var dismissBtn = root.querySelector('[data-action="dismiss-onboarding"]');
            var modal = root.querySelector('[data-region="dash-onboarding"]');
            if (modal) {
                showOnboarding(modal);
            }
            if (dismissBtn && modal) {
                dismissBtn.addEventListener('click', function() {
                    dismissOnboarding(modal);
                });
            }

            // Theme toggle is a visual affordance placeholder for Phase 1.
            var toggle = root.querySelector('[data-action="theme-toggle"]');
            if (toggle) {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                });
            }
        }
    };
});
