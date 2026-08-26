// KADSAMHSA catalogue search and filter UI.
define([], function() {
    return {
        init: function() {
            var searchInput = document.getElementById('kadsamhsa-course-search');
            var filterBtns = document.querySelectorAll('.kadsamhsa-catalogue__filter-btn');
            var courseBoxes = document.querySelectorAll('.coursebox, .kadsamhsa-course-card');

            if (!searchInput && !filterBtns.length) {
                return;
            }

            function filterCourses() {
                var query = searchInput ? searchInput.value.toLowerCase() : '';
                var activeFilter = document.querySelector('.kadsamhsa-catalogue__filter-btn.active');
                var filter = activeFilter ? activeFilter.dataset.filter : 'all';

                courseBoxes.forEach(function(box) {
                    var text = box.textContent.toLowerCase();
                    var matchesSearch = !query || text.indexOf(query) !== -1;
                    var matchesFilter = filter === 'all' || text.indexOf(filter) !== -1;
                    box.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
                });
            }

            if (searchInput) {
                searchInput.addEventListener('input', filterCourses);
            }

            filterBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    filterBtns.forEach(function(b) {
                        b.classList.remove('active');
                    });
                    btn.classList.add('active');
                    filterCourses();
                });
            });
        }
    };
});
