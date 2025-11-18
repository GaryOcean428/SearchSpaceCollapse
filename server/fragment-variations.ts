/**
 * Memory Fragment Variation Generator
 * Generates comprehensive variations of user-provided memory fragments
 * to test against the target Bitcoin address
 */

export interface FragmentVariation {
  value: string;
  description: string;
}

/**
 * Generate all reasonable variations of a base fragment
 */
export function generateFragmentVariations(baseFragments: string[]): FragmentVariation[] {
  const variations: FragmentVariation[] = [];
  const seen = new Set<string>();

  function addVariation(value: string, description: string) {
    if (!seen.has(value)) {
      seen.add(value);
      variations.push({ value, description });
    }
  }

  for (const fragment of baseFragments) {
    const cleanFragment = fragment.trim();
    if (!cleanFragment) continue;

    // 1. Capitalization variations
    addVariation(cleanFragment.toLowerCase(), `${cleanFragment} (lowercase)`);
    addVariation(cleanFragment.toUpperCase(), `${cleanFragment} (uppercase)`);
    addVariation(toTitleCase(cleanFragment), `${cleanFragment} (title case)`);
    addVariation(toCamelCase(cleanFragment), `${cleanFragment} (camel case)`);
    
    // 2. Spacing variations (if fragment contains spaces or compound words)
    if (cleanFragment.includes(' ')) {
      const noSpace = cleanFragment.replace(/\s+/g, '');
      addVariation(noSpace, `${cleanFragment} (no spaces)`);
      addVariation(noSpace.toLowerCase(), `${cleanFragment} (no spaces, lowercase)`);
      addVariation(toTitleCase(noSpace), `${cleanFragment} (no spaces, title case)`);
      
      const withUnderscore = cleanFragment.replace(/\s+/g, '_');
      addVariation(withUnderscore, `${cleanFragment} (underscores)`);
      addVariation(withUnderscore.toLowerCase(), `${cleanFragment} (underscores, lowercase)`);
      
      const withHyphen = cleanFragment.replace(/\s+/g, '-');
      addVariation(withHyphen, `${cleanFragment} (hyphens)`);
      addVariation(withHyphen.toLowerCase(), `${cleanFragment} (hyphens, lowercase)`);
    }

    // 3. Common number substitutions (if fragment has numbers)
    const hasNumbers = /\d/.test(cleanFragment);
    if (hasNumbers) {
      // Test with/without numbers
      const withoutNumbers = cleanFragment.replace(/\d+/g, '');
      if (withoutNumbers) {
        addVariation(withoutNumbers, `${cleanFragment} (no numbers)`);
        addVariation(withoutNumbers.toLowerCase(), `${cleanFragment} (no numbers, lowercase)`);
      }
      
      // Test with different common numbers
      const baseWithoutNumbers = cleanFragment.replace(/\d+/g, '');
      const commonNumbers = ['17', '77', '1', '7', '11', '21', '99'];
      for (const num of commonNumbers) {
        addVariation(baseWithoutNumbers + num, `${baseWithoutNumbers} + ${num}`);
        addVariation(baseWithoutNumbers.toLowerCase() + num, `${baseWithoutNumbers} + ${num} (lowercase)`);
      }
    } else {
      // Add common numbers to fragments without numbers
      const commonNumbers = ['17', '77', '1', '7', '11', '21', '99'];
      for (const num of commonNumbers) {
        addVariation(cleanFragment + num, `${cleanFragment} + ${num}`);
        addVariation(cleanFragment.toLowerCase() + num, `${cleanFragment} + ${num} (lowercase)`);
      }
    }

    // 4. Combinations with common separators
    const separators = ['', '_', '-', '.'];
    for (const sep of separators) {
      const sepName = sep === '' ? 'concat' : sep;
      
      // Test combinations with other fragments
      for (const otherFragment of baseFragments) {
        if (otherFragment === fragment) continue;
        const combined = cleanFragment + sep + otherFragment;
        addVariation(combined, `${cleanFragment} ${sepName} ${otherFragment}`);
        addVariation(combined.toLowerCase(), `${cleanFragment} ${sepName} ${otherFragment} (lowercase)`);
      }
    }
  }

  return variations;
}

/**
 * Generate date-based variations from known dates
 */
export function generateDateVariations(
  baseFragments: string[],
  dates: { label: string; value: string }[]
): FragmentVariation[] {
  const variations: FragmentVariation[] = [];
  const seen = new Set<string>();

  function addVariation(value: string, description: string) {
    if (!seen.has(value)) {
      seen.add(value);
      variations.push({ value, description });
    }
  }

  // Date formats to test
  const dateFormats = [
    (d: string) => d.replace(/\D/g, ''), // DDMMYYYY or MMDDYYYY
    (d: string) => d.replace(/\D/g, '').slice(-2), // Last 2 digits of year
    (d: string) => d.replace(/\D/g, '').slice(0, 4), // DDMM or MMDD
  ];

  for (const fragment of baseFragments) {
    const cleanFragment = fragment.trim();
    if (!cleanFragment) continue;

    for (const date of dates) {
      const dateValue = date.value;
      
      for (const formatFn of dateFormats) {
        const formattedDate = formatFn(dateValue);
        
        const separators = ['', '_', '-'];
        for (const sep of separators) {
          const sepName = sep === '' ? 'concat' : sep;
          
          // Fragment + date
          addVariation(
            cleanFragment + sep + formattedDate,
            `${cleanFragment} ${sepName} ${date.label} (${formattedDate})`
          );
          
          // Date + fragment
          addVariation(
            formattedDate + sep + cleanFragment,
            `${date.label} (${formattedDate}) ${sepName} ${cleanFragment}`
          );
          
          // Lowercase versions
          addVariation(
            (cleanFragment + sep + formattedDate).toLowerCase(),
            `${cleanFragment} ${sepName} ${date.label} (${formattedDate}, lowercase)`
          );
        }
      }
    }
  }

  return variations;
}

/**
 * Generate variations with personal information
 */
export function generatePersonalVariations(
  baseFragments: string[],
  personalInfo: { label: string; value: string }[]
): FragmentVariation[] {
  const variations: FragmentVariation[] = [];
  const seen = new Set<string>();

  function addVariation(value: string, description: string) {
    if (!seen.has(value)) {
      seen.add(value);
      variations.push({ value, description });
    }
  }

  for (const fragment of baseFragments) {
    const cleanFragment = fragment.trim();
    if (!cleanFragment) continue;

    for (const info of personalInfo) {
      const infoValue = info.value.replace(/\s+/g, '').toLowerCase();
      
      const separators = ['', '_', '-'];
      for (const sep of separators) {
        const sepName = sep === '' ? 'concat' : sep;
        
        // Fragment + info
        addVariation(
          cleanFragment + sep + infoValue,
          `${cleanFragment} ${sepName} ${info.label}`
        );
        
        // Info + fragment
        addVariation(
          infoValue + sep + cleanFragment,
          `${info.label} ${sepName} ${cleanFragment}`
        );
        
        // Lowercase versions
        addVariation(
          (cleanFragment + sep + infoValue).toLowerCase(),
          `${cleanFragment} ${sepName} ${info.label} (lowercase)`
        );
      }
    }
  }

  return variations;
}

/**
 * Helper: Convert to title case (First Letter Uppercase)
 */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Helper: Convert to camel case (firstWordLowercaseRestTitleCase)
 */
function toCamelCase(str: string): string {
  const words = str.split(/\s+/);
  if (words.length === 0) return str;
  
  return words[0].toLowerCase() + words.slice(1).map(w => 
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join('');
}
