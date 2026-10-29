// ============================================================
// VARIANT RULES
// ============================================================

export const variantRules = [

  // ----------------------------------------------------------
  // HBB — Sickle Cell Disease
  // ----------------------------------------------------------

  {
    id: 'hbb-hbs',
    gene: 'HBB',
    variant: 'c.20A>T (p.Glu7Val / HbS)',
    mutationType: 'SNV',
    classification: 'PATHOGENIC',
    disease: 'Sickle Cell Disease',

    referenceSequence:
      'CTGACTCCTGTGGAGAAGTCTGCC',

    mutatedSequence:
      'CTGACTCCTGTGGAGGAGTCTGCC',

    message:
      'Known HBB variant rule matched.'
  },


  // ----------------------------------------------------------
  // HBB — Reference / control sequence (BENIGN)
  //
  // Frontend demonstration rule. Only the exact, complete
  // reference sequence is recognised. It has no
  // mutatedSequence, so it never appears as a known-variant
  // button and is never returned by the button path.
  // ----------------------------------------------------------

  {
    id: 'hbb-reference',
    gene: 'HBB',
    variant:
      'Reference sequence / no HbS variant detected',
    mutationType: 'None detected',
    classification: 'BENIGN',
    disease:
      'No disease-associated variant detected by this rule',

    referenceSequence:
      'CTGACTCCTGTGGAGAAGTCTGCC',

    message:
      'Known HBB reference/control sequence matched.'
  },


  // ----------------------------------------------------------
  // CFTR — Cystic Fibrosis
  // ----------------------------------------------------------

  {
    id: 'cftr-f508del',
    gene: 'CFTR',
    variant: 'p.Phe508del (F508del)',
    mutationType: 'Deletion',
    classification: 'PATHOGENIC',
    disease: 'Cystic Fibrosis',

    /*
     * Frontend demonstration sequence supplied for the UI.
     * This exact sequence is used for automatic recognition.
     */
    mutatedSequence:
      'CTGGCACCATTAAAGAAAATATCATGGTGTTTCCTATGATGAATATAGA'
  },


  // ----------------------------------------------------------
  // HEXA — Tay-Sachs Disease
  // ----------------------------------------------------------

  {
    id: 'hexa-pathogenic',
    gene: 'HEXA',
    variant: 'Pathogenic variant',
    mutationType: '4-base insertion',
    classification: 'PATHOGENIC',
    disease: 'Tay-Sachs Disease',

    /*
     * Frontend demonstration sequence.
     * The actual variant notation is 1278insTATC.
     * This is kept as a UI matching rule rather than a
     * clinical sequence interpretation.
     */
    mutatedSequence:
      'ACGTTATCAGGCTTACGAT'
  },


  // ----------------------------------------------------------
  // HTT — Huntington Disease
  // ----------------------------------------------------------

  {
    id: 'htt-repeat-expansion',
    gene: 'HTT',
    variant: 'CAG repeat expansion',
    mutationType: 'Repeat Expansion',
    classification: 'PATHOGENIC',
    disease: 'Huntington Disease',

    mutatedSequence:
      'CAGCAGCAGCAGCAGCAGCAGCAGCAGCAG'
  }

];


// ============================================================
// GET VARIANT RULE
// ============================================================

export function getVariantRule(id) {

  return variantRules.find(
    rule => rule.id === id
  );

}


// ============================================================
// NORMALIZE SEQUENCE
// ============================================================

function normalizeSequence(sequence) {

  return String(sequence || '')
    .replace(/\s+/g, '')
    .toUpperCase();

}


// ============================================================
// HBB MATCH
// ============================================================

function matchHBB(sequence) {

  const rule = getVariantRule('hbb-hbs');

  return (
    sequence === rule.mutatedSequence
  );

}


// ============================================================
// HBB REFERENCE MATCH (exact, complete sequence only)
// ============================================================

function matchHBBReference(sequence) {

  const rule = getVariantRule('hbb-reference');

  return (
    sequence === rule.referenceSequence
  );

}


// ============================================================
// CFTR MATCH
// ============================================================

function matchCFTR(sequence) {

  const rule = getVariantRule('cftr-f508del');

  return (
    sequence === rule.mutatedSequence
  );

}


// ============================================================
// HEXA MATCH
// ============================================================

function matchHEXA(sequence) {

  const rule = getVariantRule('hexa-pathogenic');

  return (
    sequence === rule.mutatedSequence
  );

}


// ============================================================
// HTT MATCH
// ============================================================

function matchHTT(sequence) {

  const rule = getVariantRule('htt-repeat-expansion');

  if (sequence === rule.mutatedSequence) {
    return true;
  }

  /*
   * Detect the frontend demonstration of an expanded
   * CAG repeat: 10 or more CAG repeats.
   */
  const matches =
    sequence.match(/CAG/g);

  return Boolean(
    matches &&
    matches.length >= 10
  );

}


// ============================================================
// AUTOMATIC VARIANT DETECTION
// ============================================================

function detectVariant(sequence) {

  if (matchHBB(sequence)) {
    return getVariantRule('hbb-hbs');
  }

  if (matchCFTR(sequence)) {
    return getVariantRule('cftr-f508del');
  }

  if (matchHEXA(sequence)) {
    return getVariantRule('hexa-pathogenic');
  }

  /*
   * Exact known reference/control sequences.
   * Checked after the exact pathogenic matches and before
   * the HTT repeat-count heuristic. Anything unmatched
   * falls through to UNKNOWN, never BENIGN.
   */
  if (matchHBBReference(sequence)) {
    return getVariantRule('hbb-reference');
  }

  if (matchHTT(sequence)) {
    return getVariantRule('htt-repeat-expansion');
  }

  return null;

}


// ============================================================
// ANALYZE VARIANT
// ============================================================

export async function analyzeVariant(
  sequence,
  selectedGene = '',
  selectedRuleId = ''
) {

  /*
   * Small delay so the existing frontend loading state
   * remains visible during analysis.
   */
  await new Promise(
    resolve => setTimeout(resolve, 1000)
  );

  const normalizedSequence =
    normalizeSequence(sequence);


  // ----------------------------------------------------------
  // 1. KNOWN VARIANT BUTTON
  // ----------------------------------------------------------

  const selectedRule =
    getVariantRule(selectedRuleId);

  if (
    selectedRule &&
    selectedRule.mutatedSequence
  ) {

    return selectedRule;

  }


  // ----------------------------------------------------------
  // 2. AUTOMATIC DETECTION
  // ----------------------------------------------------------

  const detectedRule =
    detectVariant(normalizedSequence);

  if (detectedRule) {

    return detectedRule;

  }


  // ----------------------------------------------------------
  // 3. NO MATCH
  // ----------------------------------------------------------

  return {

    classification: 'UNKNOWN',

    gene: 'Not identified',

    variant:
      'No matching variant found',

    mutationType:
      'Not assigned',

    disease:
      'Not assigned',

    message:
      'No matching variant found.'

  };

}