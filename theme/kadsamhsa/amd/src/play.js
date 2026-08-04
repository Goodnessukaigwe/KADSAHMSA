// KADSAMHSA Course Play — lightweight media affordances.
define([], function() {
    return {
        init: function() {
            var root = document.querySelector('[data-region="kadsamhsa-course-play"]');
            if (!root) {
                return;
            }

            var playBtn = root.querySelector('[data-action="play-toggle"]');
            if (playBtn) {
                playBtn.addEventListener('click', function() {
                    playBtn.classList.toggle('is-playing');
                });
            }

            var toggle = root.querySelector('[data-action="theme-toggle"]');
            if (toggle) {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                });
            }
        }
    };
});
