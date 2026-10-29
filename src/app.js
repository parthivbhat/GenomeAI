import { analyzeVariant, getVariantRule } from './services/variantService.js';

// ============================================================
// VARIANT ANALYSIS ELEMENTS
// ============================================================

const cleanSequence = value =>
  value
    .replace(/^>.*$/gm, '')
    .replace(/\s+/g, '')
    .toUpperCase();

const pages = [...document.querySelectorAll('.page')];
const navs = [...document.querySelectorAll('.nav-link')];

const textarea = document.querySelector('#variant-sequence');
const counter = document.querySelector('#variant-counter');
const error = document.querySelector('#variant-error');
const selectedRule = document.querySelector('#selected-rule');

const result = document.querySelector('#variant-result');
const empty = document.querySelector('#variant-empty');
const loader = document.querySelector('#variant-loading');

const analyzeButton = document.querySelector('#analyze-button');

let selectedRuleId = '';


// ============================================================
// SEQUENCE COUNTER
// ============================================================

function updateCounter() {
  counter.textContent =
    `${cleanSequence(textarea.value).length.toLocaleString()} bp`;
}


// ============================================================
// SEQUENCE VALIDATION
// ============================================================

function validate(sequence) {

  if (!sequence && !selectedRuleId) {
    return 'Enter a DNA sequence or select a known variant.';
  }

  if (sequence && !/^[ACGTN]+$/.test(sequence)) {
    return 'DNA can contain only A, C, G, T, or N.';
  }

  return '';
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(value).replace(
    /[&<>'"]/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[char]
  );
}


// ============================================================
// VARIANT RESULT UI
// ============================================================

function resultMarkup(data) {

  const state = data.classification.toLowerCase();

  const note =
    data.classification === 'UNKNOWN'
      ? 'No matching variant found.'
      : 'Variant rule matched.';

  return `
    <div class="result-kicker">
      ANALYSIS RESULT
    </div>

    <div class="result-status ${state}">

      <span>
        ${state === 'pathogenic' ? '●' : '○'}
      </span>

      <div>
        <p>Classification</p>
        <h3>${escapeHtml(data.classification)}</h3>
      </div>

    </div>

    <dl class="variant-fields">

      <div>
        <dt>Gene</dt>
        <dd>${escapeHtml(data.gene)}</dd>
      </div>

      <div>
        <dt>Variant</dt>
        <dd>${escapeHtml(data.variant)}</dd>
      </div>

      <div>
        <dt>Mutation type</dt>
        <dd>${escapeHtml(data.mutationType)}</dd>
      </div>

      <div>
        <dt>Associated disease</dt>
        <dd>${escapeHtml(data.disease)}</dd>
      </div>

    </dl>

    <div class="explanation">
      <strong>${note}</strong>
    </div>
  `;
}


// ============================================================
// SELECT KNOWN VARIANT
// ============================================================

function selectRule(id) {

  const rule = getVariantRule(id);

  selectedRuleId = id;

  // Gene field may no longer exist (automatic gene detection)
  const geneField = document.querySelector('#gene');

  if (geneField) {
    geneField.value = rule.gene;
  }

  textarea.value = rule.mutatedSequence || '';

  selectedRule.textContent =
    `Selected variant: ${rule.variant}`;

  updateCounter();

  error.textContent = '';

  result.classList.add('hidden');

  empty.classList.remove('hidden');
}


// ============================================================
// ANIMATION HELPERS
// ============================================================

// Line charts: grid fades in, each line draws left to right,
// and each point pops in as its line reaches it.
function animateLineChart(root) {

  root
    .querySelectorAll('.roc-line-svg, .evaluation-line-chart')
    .forEach(svg => {

      const lines = [...svg.querySelectorAll('polyline, .chart-line')];
      const dots = [...svg.querySelectorAll('circle')];

      // Grid lines fade in first
      svg.querySelectorAll('.chart-grid').forEach(grid => {
        grid.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 600, fill: 'backwards' }
        );
      });

      // Lines draw themselves
      lines.forEach((line, i) => {

        if (typeof line.getTotalLength !== 'function') return;

        const length = line.getTotalLength();

        line.style.strokeDasharray = length;
        line.style.opacity = '';

        const drawing = line.animate(
          [
            { strokeDashoffset: length },
            { strokeDashoffset: 0 }
          ],
          {
            duration: 1400,
            delay: 400 + i * 150,
            easing: 'cubic-bezier(.4, 0, .2, 1)',
            fill: 'backwards'
          }
        );

        // Remove dash styling afterwards so the line renders solid
        drawing.onfinish = () => {
          line.style.strokeDasharray = '';
        };
      });

      // Points pop in along their line
      const perLine = Math.max(
        1,
        Math.round(dots.length / Math.max(lines.length, 1))
      );

      dots.forEach((dot, i) => {

        const lineIndex = Math.floor(i / perLine);
        const pointIndex = i % perLine;

        const progress =
          perLine > 1 ? pointIndex / (perLine - 1) : 0;

        dot.style.transformBox = 'fill-box';
        dot.style.transformOrigin = 'center';
        dot.style.opacity = '';

        dot.animate(
          [
            { opacity: 0, transform: 'scale(0)' },
            { opacity: 1, transform: 'scale(1.5)', offset: 0.7 },
            { opacity: 1, transform: 'scale(1)' }
          ],
          {
            duration: 450,
            delay: 400 + lineIndex * 150 + progress * 1300,
            easing: 'ease-out',
            fill: 'backwards'
          }
        );
      });
    });
}

// Count-up for text like "0.7219" or "72.19%"
function countUpText(el, duration = 1000, delay = 400) {

  if (!el.dataset.original) {
    el.dataset.original = el.textContent.trim();
  }

  const text = el.dataset.original;
  const match = text.match(/-?\d+(\.\d+)?/);

  if (!match) return;

  const target = parseFloat(match[0]);
  const decimals = match[1] ? match[1].length - 1 : 0;

  el.textContent = text.replace(match[0], (0).toFixed(decimals));

  setTimeout(() => {

    const start = performance.now();

    function tick(now) {

      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      el.textContent =
        text.replace(match[0], (target * eased).toFixed(decimals));

      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

  }, delay);
}

function countUpLabels(root) {
  root
    .querySelectorAll('.bar span, .research-bar span')
    .forEach(el => countUpText(el));
}

// Bars grow from the baseline, staggered by model group then by split.
// Uses the Web Animations API so it works with any chart markup.
function animateBars(root) {

  root.querySelectorAll('.bar, .research-bar').forEach(bar => {

    const group = bar.closest('.bar-group, .research-model');

    const groupIndex = group
      ? [...group.parentElement.children].indexOf(group)
      : 0;

    const barIndex =
      [...bar.parentElement.children].indexOf(bar);

    const delay = 250 + groupIndex * 160 + barIndex * 110;

    bar.style.transformOrigin = 'bottom';
    bar.style.visibility = '';

    bar.animate(
      [
        { transform: 'scaleY(0)' },
        { transform: 'scaleY(1)' }
      ],
      {
        duration: 1000,
        delay,
        easing: 'cubic-bezier(.2, .8, .2, 1)',
        fill: 'backwards'
      }
    );

    // Value label fades in once its bar has grown
    const label = bar.querySelector('span');

    if (label) {
      label.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 400, delay: delay + 750, fill: 'backwards' }
      );
    }
  });
}

// Count-up for the delta values
function animateDeltaValue(el, duration = 900) {

  const target = parseFloat(el.dataset.value || el.textContent);

  if (Number.isNaN(target)) return;

  el.dataset.value = target;

  const start = performance.now();

  function tick(now) {

    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    el.textContent = (target * eased).toFixed(4);

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ------------------------------------------------------------
// Scroll-triggered chart animations
// Charts stay hidden until they scroll into view, then animate.
// ------------------------------------------------------------

const CHART_CARD_SELECTOR =
  '.evaluation-card, .research-card, .research-delta-card';

const chartObserver = new IntersectionObserver(entries => {

  entries.forEach(entry => {

    if (!entry.isIntersecting) return;

    const card = entry.target;

    chartObserver.unobserve(card);

    animateBars(card);
    animateLineChart(card);
    countUpLabels(card);

    if (card.matches('.research-delta-card')) {
      card
        .querySelectorAll('h3')
        .forEach(el => animateDeltaValue(el));
    }
  });

}, { threshold: 0.25 });

// Hide chart elements so nothing flashes before its animation
function prepChartCard(card) {

  card
    .querySelectorAll('.bar, .research-bar')
    .forEach(bar => { bar.style.visibility = 'hidden'; });

  card
    .querySelectorAll(
      '.roc-line-svg polyline, .evaluation-line-chart .chart-line, ' +
      '.roc-line-svg circle, .evaluation-line-chart circle'
    )
    .forEach(el => { el.style.opacity = '0'; });

  if (card.matches('.research-delta-card')) {
    card.querySelectorAll('h3').forEach(el => {
      const value = parseFloat(el.dataset.value || el.textContent);

      if (!Number.isNaN(value)) {
        el.dataset.value = value;
        el.textContent = (0).toFixed(4);
      }
    });
  }
}

// Call whenever a result page is revealed
function observeCharts(root) {

  let cards = [...root.querySelectorAll(CHART_CARD_SELECTOR)];

  if (!cards.length) {
    cards = [root];
  }

  cards.forEach(card => {
    chartObserver.unobserve(card);
    prepChartCard(card);
    chartObserver.observe(card);
  });
}

// Restart a CSS animation class on an element
function replayShowResults(el) {
  el.classList.remove('show-results');
  void el.offsetWidth;
  el.classList.add('show-results');
}

// Hide the old run button + loading indicator of a page
function hideLoadingUi(buttonSelector, loadingSelector) {

  const button = document.querySelector(buttonSelector);
  const loading = document.querySelector(loadingSelector);

  if (loading) {
    loading.classList.add('hidden');
  }

  if (button) {
    const action = button.closest('.evaluation-action');

    if (action) {
      action.style.display = 'none';
    } else {
      button.style.display = 'none';
    }
  }
}


// ============================================================
// RESULT PAGES (NO LOADING - SHOWN INSTANTLY WITH ANIMATION)
// ============================================================

// Model Evaluation
function showEvaluationPage() {

  hideLoadingUi('#run-evaluation', '#evaluation-loading');

  const evaluationResults =
    document.querySelector('#evaluation-results');

  if (evaluationResults) {
    evaluationResults.classList.remove('hidden');
    replayShowResults(evaluationResults);
    observeCharts(evaluationResults);
  }
}

// Research Results
function showResearchResultsPage() {

  hideLoadingUi('#run-research-results', '#research-results-loading');

  const page = document.querySelector('#research-results');

  if (!page) return;

  [...page.children].forEach(child => {

    if (!child.classList.contains('evaluation-action')) {
      child.classList.remove('research-hidden');
      replayShowResults(child);
    }

  });

  observeCharts(page);
}

// Experimental Analysis
function showExperimentalAnalysisPage() {

  hideLoadingUi(
    '#run-experimental-analysis',
    '#experimental-analysis-loading'
  );

  const content =
    document.querySelector('#experimental-analysis-content');

  if (!content) return;

  content.classList.remove('research-hidden');

  observeCharts(content);
}

const pageReveals = {
  evaluation: showEvaluationPage,
  'research-results': showResearchResultsPage,
  'experimental-analysis': showExperimentalAnalysisPage
};


// ============================================================
// PAGE NAVIGATION
// ============================================================

function navigate(id) {

  // Hide all pages except selected page
  pages.forEach(page => {
    page.classList.toggle('active', page.id === id);
  });

  // Update active sidebar button
  navs.forEach(nav => {
    nav.classList.toggle(
      'active',
      nav.dataset.page === id
    );
  });

  // Top navigation title
  const pageTitles = {
    dashboard: 'Research dashboard',
    variant: 'Genetic variant analysis',
    evaluation: 'Basic model evaluation',
    'research-results': 'Research results',
    'experimental-analysis': 'Experimental analysis'
  };

  const pageTitle = document.querySelector('#page-title');

  if (pageTitle) {
    pageTitle.textContent =
      pageTitles[id] || 'GenomeAI';
  }

  // Show result pages instantly with their animations
  if (pageReveals[id]) {
    pageReveals[id]();
  }

  // Close sidebar on mobile
  const sidebar = document.querySelector('.sidebar');

  if (sidebar) {
    sidebar.classList.remove('open');
  }

  // Scroll to top
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


// ============================================================
// VARIANT TEXTAREA
// ============================================================

textarea.addEventListener('input', () => {

  selectedRuleId = '';

  selectedRule.textContent = '';

  error.textContent = '';

  updateCounter();
});


// ============================================================
// KNOWN VARIANT BUTTONS
// ============================================================

document
  .querySelectorAll('[data-rule]')
  .forEach(button => {

    button.addEventListener('click', () => {

      selectRule(button.dataset.rule);

    });

  });


// ============================================================
// ANALYZE VARIANT
// ============================================================

analyzeButton.addEventListener('click', async () => {

  const sequence =
    cleanSequence(textarea.value);

  const validationError =
    validate(sequence);


  // Validation error
  if (validationError) {

    error.textContent =
      validationError;

    textarea.focus();

    return;
  }


  textarea.value = sequence;

  updateCounter();

  error.textContent = '';


  // Show loading state
  empty.classList.add('hidden');

  result.classList.add('hidden');

  loader.classList.remove('hidden');

  analyzeButton.disabled = true;


  try {

    const analysis =
      await analyzeVariant(
        sequence,
        '',
        selectedRuleId
      );

    // Keep loader visible for ~5 seconds
    await new Promise(
      resolve => setTimeout(resolve, 5000)
    );

    result.innerHTML =
      resultMarkup(analysis);

    result.classList.remove('hidden');

  }

  catch (err) {

    console.error(
      'Variant analysis failed:',
      err
    );

    error.textContent =
      'Unable to analyze the variant. Please try again.';

    empty.classList.remove('hidden');

  }

  finally {

    loader.classList.add('hidden');

    analyzeButton.disabled = false;

  }

});


// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

navs.forEach(button => {

  button.addEventListener('click', () => {

    navigate(button.dataset.page);

  });

});


// ============================================================
// DASHBOARD NAVIGATION BUTTONS
// ============================================================

document
  .querySelectorAll('[data-go]')
  .forEach(button => {

    button.addEventListener('click', () => {

      navigate(
        button.dataset.go
      );

    });

  });


// ============================================================
// MOBILE MENU
// ============================================================

const menuButton =
  document.querySelector('.menu');

if (menuButton) {

  menuButton.addEventListener('click', () => {

    document
      .querySelector('.sidebar')
      .classList
      .toggle('open');

  });

}


// ============================================================
// INITIALIZATION
// ============================================================

updateCounter();