// KADSAMHSA courses page — free/paid tabs + search.
define([], function() {
    /**
     * Apply current filter + search to course cards.
     *
     * @param {HTMLElement} root
     */
    function applyFilters(root) {
        var activeTab = root.querySelector('.kadsamhsa-courses-tabs__btn.is-active');
        var filter = activeTab ? activeTab.getAttribute('data-filter') : 'free';
        var searchInput = root.querySelector('[data-action="courses-search"]');
        var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var cards = root.querySelectorAll('.kadsamhsa-ccard');
        var empty = root.querySelector('[data-region="courses-empty"]');
        var visible = 0;

        cards.forEach(function(card) {
            var price = card.getAttribute('data-price') || 'free';
            var title = (card.getAttribute('data-title') || '').toLowerCase();
            var priceMatch = price === filter;
            var searchMatch = !query || title.indexOf(query) !== -1;
            var show = priceMatch && searchMatch;
            card.hidden = !show;
            if (show) {
                visible += 1;
            }
        });

        if (empty) {
            empty.hidden = visible > 0;
        }
    }

    return {
        init: function() {
            var root = document.querySelector('[data-region="kadsamhsa-courses"]');
            if (!root) {
                return;
            }

            var tabs = root.querySelectorAll('.kadsamhsa-courses-tabs__btn');
            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    tabs.forEach(function(t) {
                        t.classList.remove('is-active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    tab.classList.add('is-active');
                    tab.setAttribute('aria-selected', 'true');
                    applyFilters(root);
                });
            });

            var searchInput = root.querySelector('[data-action="courses-search"]');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    applyFilters(root);
                });
            }

            applyFilters(root);
        }
    };
});
