/**
 * FISHER ANALYSIS MODULE
 * 
 * Fisher Information Matrix computation and eigendecomposition algorithms.
 * Extracted from geometric-memory.ts for modularity.
 * 
 * Contains:
 * - Symmetric eigendecomposition (Jacobi method)
 * - Lanczos algorithm for sparse matrices
 * - Power iteration
 * - Fisher matrix construction with Tikhonov regularization
 */

import type { BasinProbe } from '../geometric-memory';

export interface FisherAnalysisResult {
  matrix: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  exploredDimensions: number[];
  unexploredDimensions: number[];
  effectiveRank: number;
  covarianceMeans: number[];
}

export interface FisherAnalysisCache {
  result: FisherAnalysisResult | null;
  dataVersion: number;
}

/**
 * Symmetric eigendecomposition using Jacobi method.
 * O(n³) complexity - use for smaller matrices.
 */
export function symmetricEigendecomposition(matrix: number[][]): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const n = matrix.length;
  if (n === 0) return { eigenvalues: [], eigenvectors: [] };

  const A: number[][] = matrix.map(row => [...row]);
  const V: number[][] = [];
  for (let i = 0; i < n; i++) {
    V[i] = new Array(n).fill(0);
    V[i][i] = 1;
  }

  const maxIterations = 100;
  const tolerance = 1e-10;

  for (let iter = 0; iter < maxIterations; iter++) {
    let maxOffDiag = 0;
    let p = 0, q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxOffDiag) {
          maxOffDiag = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxOffDiag < tolerance) break;

    const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
    A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
    A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Aip = A[i][p], Aiq = A[i][q];
        A[i][p] = c * Aip - s * Aiq;
        A[p][i] = A[i][p];
        A[i][q] = s * Aip + c * Aiq;
        A[q][i] = A[i][q];
      }
    }

    for (let i = 0; i < n; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  const eigenvalues = A.map((row, i) => row[i]);
  
  const indices = eigenvalues.map((_, i) => i);
  indices.sort((a, b) => Math.abs(eigenvalues[b]) - Math.abs(eigenvalues[a]));

  const sortedEigenvalues = indices.map(i => eigenvalues[i]);
  const sortedEigenvectors: number[][] = [];
  for (let i = 0; i < n; i++) {
    sortedEigenvectors[i] = indices.map(j => V[i][j]);
  }

  return { eigenvalues: sortedEigenvalues, eigenvectors: sortedEigenvectors };
}

/**
 * Lanczos algorithm for top-k eigenvalues.
 * O(k * n * m) where m is matrix-vector multiply cost.
 * Optimal for large sparse/structured matrices.
 */
export function lanczosEigendecomposition(matrix: number[][], k: number): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const n = matrix.length;
  if (n === 0) return { eigenvalues: [], eigenvectors: [] };

  const numLanczosVectors = Math.min(k + 10, n);
  
  const T: number[][] = [];
  for (let i = 0; i < numLanczosVectors; i++) {
    T[i] = new Array(numLanczosVectors).fill(0);
  }
  
  const V: number[][] = [];

  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  v = v.map(x => x / norm);
  V.push(v);

  let vPrev = new Array(n).fill(0);
  let beta = 0;

  for (let j = 0; j < numLanczosVectors; j++) {
    const w = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let l = 0; l < n; l++) {
        w[i] += matrix[i][l] * v[l];
      }
    }

    const alpha = w.reduce((s, x, i) => s + x * v[i], 0);
    T[j][j] = alpha;

    for (let i = 0; i < n; i++) {
      w[i] = w[i] - alpha * v[i] - beta * vPrev[i];
    }

    beta = Math.sqrt(w.reduce((s, x) => s + x * x, 0));

    if (beta < 1e-10 || j === numLanczosVectors - 1) break;

    T[j][j + 1] = beta;
    T[j + 1][j] = beta;

    vPrev = v;
    v = w.map(x => x / beta);
    V.push(v);
  }

  const actualSize = V.length;
  const Tsub = T.slice(0, actualSize).map(row => row.slice(0, actualSize));
  
  const { eigenvalues: tEigenvalues, eigenvectors: tEigenvectors } = 
    symmetricEigendecomposition(Tsub);

  const eigenvalues = tEigenvalues.slice(0, k);
  const eigenvectors: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    eigenvectors[i] = new Array(k).fill(0);
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < actualSize; l++) {
        eigenvectors[i][j] += (V[l]?.[i] || 0) * (tEigenvectors[l]?.[j] || 0);
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

/**
 * Power iteration for eigenvalue decomposition.
 * Returns top-k eigenvalues and eigenvectors.
 */
export function powerIterationEigen(matrix: number[][], k: number): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const n = matrix.length;
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];
  
  const A: number[][] = matrix.map(row => [...row]);

  for (let iter = 0; iter < k; iter++) {
    let v = Array.from({ length: n }, () => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);

    for (let powerIter = 0; powerIter < 50; powerIter++) {
      const Av = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Av[i] += A[i][j] * v[j];
        }
      }
      
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) break;
      v = Av.map(x => x / norm);
    }

    let lambda = 0;
    for (let i = 0; i < n; i++) {
      let Avi = 0;
      for (let j = 0; j < n; j++) {
        Avi += A[i][j] * v[j];
      }
      lambda += v[i] * Avi;
    }

    eigenvalues.push(lambda);
    eigenvectors.push(v);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        A[i][j] -= lambda * v[i] * v[j];
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

/**
 * Compute Fisher Information Matrix from probes.
 * Uses full covariance matrix with SVD-based pseudoinverse (Tikhonov regularization).
 */
export function computeFisherInformationMatrix(
  probes: BasinProbe[],
  dimensions: number = 32
): FisherAnalysisResult {
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  
  if (withCoords.length < 10) {
    return {
      matrix: [],
      eigenvalues: [],
      eigenvectors: [],
      exploredDimensions: [],
      unexploredDimensions: Array.from({ length: dimensions }, (_, i) => i),
      effectiveRank: 0,
      covarianceMeans: [],
    };
  }

  const dims = Math.min(withCoords[0].coordinates.length, dimensions);
  
  const means = new Array(dims).fill(0);
  for (const probe of withCoords) {
    for (let d = 0; d < dims; d++) {
      means[d] += probe.coordinates[d] || 0;
    }
  }
  for (let d = 0; d < dims; d++) {
    means[d] /= withCoords.length;
  }

  const covariance: number[][] = [];
  for (let i = 0; i < dims; i++) {
    covariance[i] = new Array(dims).fill(0);
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (const probe of withCoords) {
        const ci = (probe.coordinates[i] || 0) - means[i];
        const cj = (probe.coordinates[j] || 0) - means[j];
        sum += ci * cj;
      }
      const cov = sum / (withCoords.length - 1);
      covariance[i][j] = cov;
      covariance[j][i] = cov;
    }
  }

  const useLanczos = dims > 20;
  const { eigenvalues: covEigenvalues, eigenvectors: covEigenvectors } = useLanczos
    ? lanczosEigendecomposition(covariance, 12)
    : symmetricEigendecomposition(covariance);

  const epsilon = 0.01;
  const fisherEigenvalues: number[] = covEigenvalues.map(lambda => 
    1 / (Math.abs(lambda) + epsilon)
  );

  const fisher: number[][] = [];
  for (let i = 0; i < dims; i++) {
    fisher[i] = new Array(dims).fill(0);
    for (let j = 0; j < dims; j++) {
      let sum = 0;
      for (let k = 0; k < dims; k++) {
        sum += covEigenvectors[i][k] * fisherEigenvalues[k] * covEigenvectors[j][k];
      }
      fisher[i][j] = sum;
    }
  }

  const maxEigenvalue = Math.max(...covEigenvalues.map(Math.abs));
  const threshold = maxEigenvalue * 0.02;
  
  const exploredDimensions: number[] = [];
  const unexploredDimensions: number[] = [];

  for (let i = 0; i < covEigenvalues.length; i++) {
    if (Math.abs(covEigenvalues[i]) >= threshold) {
      exploredDimensions.push(i);
    } else {
      unexploredDimensions.push(i);
    }
  }

  const effectiveRank = exploredDimensions.length;

  console.log(`[FisherAnalysis] Fisher analysis: ${effectiveRank}/${dims} dimensions explored`);
  console.log(`[FisherAnalysis] Max eigenvalue: ${maxEigenvalue.toFixed(4)}, threshold: ${threshold.toFixed(4)}`);

  return {
    matrix: fisher,
    eigenvalues: fisherEigenvalues,
    eigenvectors: covEigenvectors,
    exploredDimensions,
    unexploredDimensions,
    effectiveRank,
    covarianceMeans: means,
  };
}

/**
 * Compute Mahalanobis distance from a point to the explored manifold.
 * Uses Fisher Information Matrix as metric tensor.
 */
export function computeMahalanobisDistance(
  coords: number[],
  fisherMatrix: number[][],
  means: number[]
): number {
  if (fisherMatrix.length === 0 || coords.length === 0) return 0;
  
  const dims = Math.min(coords.length, fisherMatrix.length);
  const diff = coords.slice(0, dims).map((c, i) => c - (means[i] || 0));
  
  let mahalanobis = 0;
  for (let i = 0; i < dims; i++) {
    for (let j = 0; j < dims; j++) {
      mahalanobis += diff[i] * (fisherMatrix[i]?.[j] || 0) * diff[j];
    }
  }
  
  return Math.sqrt(Math.max(0, mahalanobis));
}
