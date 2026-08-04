// KADSAMHSA My Courses — tab filters.
define([], function() {
    var TITLES = {
        all: 'All courses',
        inprogress: 'In progress',
        completed: 'Completed',
        notstarted: 'Not started yet'
    };

    /**
     * @param {HTMLElement} root
     * @param {string} filter
     */
    function applyFilter(root, filter) {
        var cards = root.querySelectorAll('[data-region="mycourses-grid"] .kadsamhsa-shome-card');
        var empty = root.querySelector('[data-region="mycourses-empty"]');
        var title = root.querySelector('[data-region="section-title"]');
        var visible = 0;

        cards.forEach(function(card) {
            var status = card.getAttribute('data-status') || 'notstarted';
            var show = filter === 'all' || status === filter;
            card.hidden = !show;
            if (show) {
                visible += 1;
            }
        });

        if (empty) {
            empty.hidden = visible > 0;
        }
        if (title && TITLES[filter]) {
            title.textContent = TITLES[filter];
        }
    }

    return {
        init: function() {
            var root = document.querySelector('[data-region="kadsamhsa-mycourses"]');
            if (!root) {
                return;
            }

            var tabs = root.querySelectorAll('.kadsamhsa-mycourses-tabs__btn');
            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    tabs.forEach(function(t) {
                        t.classList.remove('is-active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    tab.classList.add('is-active');
                    tab.setAttribute('aria-selected', 'true');
                    applyFilter(root, tab.getAttribute('data-filter') || 'all');
                });
            });

            applyFilter(root, 'notstarted');
        }
    };
});
