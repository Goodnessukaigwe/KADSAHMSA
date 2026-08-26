// KADSAMHSA Course Quiz — Figma quiz + result modal demo.
define([], function() {
    var LETTERS = ['A', 'B', 'C', 'D'];

    /**
     * @param {number} seconds
     * @return {string}
     */
    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    /**
     * @param {HTMLElement} root
     * @return {Object[]}
     */
    function parseQuestions(root) {
        try {
            return JSON.parse(root.getAttribute('data-questions') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * @param {HTMLElement} root
     */
    function init(root) {
        var questions = parseQuestions(root);
        if (!questions.length) {
            return;
        }

        var answers = {};
        var current = 0;
        var finished = false;
        var passmark = parseInt(root.getAttribute('data-passmark') || '70', 10);
        var attemptsLeft = parseInt(root.getAttribute('data-attempts') || '2', 10);
        var attemptsTotal = parseInt(root.getAttribute('data-attempts-total') || '3', 10);
        var playUrl = root.getAttribute('data-playurl') || '#';
        var detailUrl = root.getAttribute('data-detailurl') || '#';
        var passHeadline = root.getAttribute('data-pass-headline') || 'You dey burst my brain!';
        var failHeadline = root.getAttribute('data-fail-headline') || 'Not quite - but you\'re close';
        var resultFeedbackText = root.getAttribute('data-result-feedback') ||
            ('The pass mark is ' + passmark + '%. Consider reviewing Module 2 (Drug Screening) and Module 9 (Special Populations) as most missed questions came from there.');
        var moveOnLabel = root.getAttribute('data-moveon-label') || 'Move on to next module';
        var retakeLabel = root.getAttribute('data-retake-label') || 'Retake course';

        var promptEl = root.querySelector('[data-region="quiz-prompt"]');
        var optionsEl = root.querySelector('[data-region="quiz-options"]');
        var counterEl = root.querySelector('[data-region="quiz-counter"]');
        var progressEl = root.querySelector('[data-region="quiz-progress"]');
        var gridEl = root.querySelector('[data-region="quiz-grid"]');
        var prevBtn = root.querySelector('[data-action="quiz-prev"]');
        var nextBtn = root.querySelector('[data-action="quiz-next"]');
        var timerEl = root.querySelector('[data-region="quiz-timer"]');
        var resultEl = root.querySelector('[data-region="quiz-result"]');
        var resultScoreMain = root.querySelector('[data-region="result-score-main"]');
        var resultScoreTotal = root.querySelector('[data-region="result-score-total"]');
        var resultBar = root.querySelector('[data-region="result-bar"]');
        var resultHeadline = root.querySelector('[data-region="result-headline"]');
        var resultFeedback = root.querySelector('[data-region="result-feedback"]');
        var resultAttempts = root.querySelector('[data-region="result-attempts"]');
        var resultPrimary = root.querySelector('[data-region="result-primary"]');
        var resultSecondary = root.querySelector('[data-region="result-secondary"]');
        var nextLabel = (nextBtn && nextBtn.textContent) || 'Next question';

        var remaining = parseInt((timerEl && timerEl.getAttribute('data-seconds')) || '1800', 10);
        var timerId = null;

        /**
         * Render the active question.
         */
        function render() {
            var q = questions[current];
            if (!q) {
                return;
            }

            if (promptEl) {
                promptEl.textContent = q.prompt;
            }

            if (counterEl) {
                counterEl.textContent = 'Question ' + (current + 1) + ' of ' + questions.length;
            }

            if (optionsEl) {
                optionsEl.innerHTML = '';
                (q.options || []).forEach(function(text, i) {
                    var letter = LETTERS[i] || String(i + 1);
                    var selected = answers[current] === letter;
                    var isCorrect = letter === q.correct;
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'kadsamhsa-quizui__option';
                    btn.setAttribute('role', 'option');
                    btn.setAttribute('data-action', 'quiz-pick');
                    btn.setAttribute('data-value', letter);

                    if (selected && isCorrect) {
                        btn.classList.add('is-selected');
                    } else if (selected && !isCorrect) {
                        btn.classList.add('is-incorrect');
                    }

                    btn.innerHTML =
                        '<span class="kadsamhsa-quizui__letter">' + letter + '</span>' +
                        '<span class="kadsamhsa-quizui__optiontext"></span>';
                    btn.querySelector('.kadsamhsa-quizui__optiontext').textContent = text;
                    optionsEl.appendChild(btn);
                });
            }

            if (progressEl) {
                progressEl.querySelectorAll('.kadsamhsa-quizui__seg').forEach(function(seg, i) {
                    seg.classList.toggle('is-active', i === current);
                    seg.classList.toggle('is-answered', typeof answers[i] !== 'undefined');
                });
            }

            if (gridEl) {
                gridEl.querySelectorAll('[data-action="quiz-jump"]').forEach(function(btn, i) {
                    btn.classList.toggle('is-current', i === current);
                    btn.classList.toggle('is-answered', typeof answers[i] !== 'undefined');
                });
            }

            if (prevBtn) {
                prevBtn.disabled = current === 0 || finished;
            }
            if (nextBtn) {
                nextBtn.disabled = finished;
                nextBtn.textContent = nextLabel;
            }
        }

        /**
         * Score and show result modal (Figma pass/fail placeholders).
         */
        function finishQuiz() {
            if (finished) {
                return;
            }
            finished = true;
            if (timerId) {
                window.clearInterval(timerId);
            }

            var correct = 0;
            questions.forEach(function(q, i) {
                if (answers[i] === q.correct) {
                    correct += 1;
                }
            });
            var realScore = Math.round((correct / questions.length) * 100);
            var passed = realScore >= passmark;
            // Figma demo placeholders: 89 pass / 64 fail.
            var score = passed ? 89 : 64;
            if (!passed) {
                attemptsLeft = Math.max(0, attemptsLeft - 1);
            }

            root.classList.toggle('is-pass', passed);
            root.classList.toggle('is-fail', !passed);
            if (resultEl) {
                resultEl.classList.toggle('is-pass', passed);
                resultEl.classList.toggle('is-fail', !passed);
            }

            if (resultScoreMain) {
                resultScoreMain.textContent = String(score);
            }
            if (resultScoreTotal) {
                resultScoreTotal.textContent = '/100';
            }
            if (resultBar) {
                resultBar.style.width = score + '%';
            }
            if (resultHeadline) {
                resultHeadline.textContent = passed ? passHeadline : failHeadline;
            }
            if (resultFeedback) {
                resultFeedback.textContent = resultFeedbackText;
            }
            if (resultAttempts) {
                resultAttempts.textContent = 'Attempts left: ' + attemptsLeft + '/' + attemptsTotal;
            }
            if (resultPrimary) {
                resultPrimary.textContent = passed ? moveOnLabel : retakeLabel;
                resultPrimary.setAttribute('data-mode', passed ? 'pass' : 'fail');
            }
            if (resultSecondary) {
                resultSecondary.setAttribute('href', detailUrl);
            }
            if (resultEl) {
                resultEl.hidden = false;
                document.body.classList.add('kadsamhsa-quiz-result-open');
            }
            if (nextBtn) {
                nextBtn.disabled = true;
            }
            if (prevBtn) {
                prevBtn.disabled = true;
            }
        }

        /**
         * Start countdown.
         */
        function startTimer() {
            if (!timerEl) {
                return;
            }
            timerEl.textContent = formatTime(remaining);
            timerId = window.setInterval(function() {
                remaining -= 1;
                if (remaining <= 0) {
                    remaining = 0;
                    timerEl.textContent = formatTime(0);
                    finishQuiz();
                    return;
                }
                timerEl.textContent = formatTime(remaining);
            }, 1000);
        }

        root.addEventListener('click', function(e) {
            var pick = e.target.closest('[data-action="quiz-pick"]');
            if (pick && !finished) {
                answers[current] = pick.getAttribute('data-value');
                render();
                return;
            }

            var jump = e.target.closest('[data-action="quiz-jump"]');
            if (jump && !finished) {
                current = parseInt(jump.getAttribute('data-index') || '0', 10);
                render();
                return;
            }

            if (e.target.closest('[data-action="quiz-prev"]') && current > 0 && !finished) {
                current -= 1;
                render();
                return;
            }

            if (e.target.closest('[data-action="quiz-next"]') && !finished) {
                if (current >= questions.length - 1) {
                    finishQuiz();
                } else {
                    current += 1;
                    render();
                }
                return;
            }

            if (e.target.closest('[data-action="quiz-primary"]')) {
                var mode = resultPrimary && resultPrimary.getAttribute('data-mode');
                if (mode === 'pass') {
                    window.location.href = playUrl;
                } else {
                    window.location.reload();
                }
            }
        });

        render();
        startTimer();
    }

    return {
        init: function() {
            var root = document.querySelector('[data-region="kadsamhsa-course-quiz"]');
            if (root) {
                init(root);
            }
        }
    };
});
