/**
 * STORAGE FACADE
 * 
 * Central access point for all persistence operations.
 * Exposes domain-specific repositories with configurable backends.
 * 
 * Usage:
 *   import { storageFacade } from './persistence';
 *   const candidates = await storageFacade.candidates.getCandidates();
 * 
 * The facade uses concrete adapters (JSON, Postgres) that implement
 * the domain interfaces. New modules should depend on the facade,
 * not on storage.ts or ocean-persistence.ts directly.
 */

import type {
  ICandidateStorage,
  ITargetAddressStorage,
  ISearchJobStorage,
  IUserStorage,
  IOceanProbeStorage,
  ITestedPhraseStorage,
  StorageConfig,
} from './interfaces';
import {
  CandidateJsonAdapter,
  CandidatePostgresAdapter,
  SearchJobJsonAdapter,
  SearchJobPostgresAdapter,
  TargetAddressPostgresAdapter,
} from './adapters';
import { storage as memStorage } from '../storage';
import { db } from '../db';
import { oceanPersistence } from '../ocean/ocean-persistence';

class StorageFacade {
  private _candidates: ICandidateStorage;
  private _targetAddresses: ITargetAddressStorage;
  private _searchJobs: ISearchJobStorage;
  private _users: IUserStorage;
  private _oceanProbes: IOceanProbeStorage | null = null;
  private _testedPhrases: ITestedPhraseStorage | null = null;
  private _config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this._config = {
      backend: config?.backend ?? 'json',
      dataDir: config?.dataDir,
    };

    if (this._config.backend === 'postgres' && db) {
      this._candidates = new CandidatePostgresAdapter();
      this._searchJobs = new SearchJobPostgresAdapter();
      this._targetAddresses = new TargetAddressPostgresAdapter();
      this._users = memStorage;
    } else if (this._config.backend === 'json') {
      const candidatePath = this._config.dataDir
        ? `${this._config.dataDir}/candidates.json`
        : undefined;
      const jobsPath = this._config.dataDir
        ? `${this._config.dataDir}/search-jobs.json`
        : undefined;
      this._candidates = new CandidateJsonAdapter({ filePath: candidatePath });
      this._searchJobs = new SearchJobJsonAdapter({ filePath: jobsPath });
      this._targetAddresses = memStorage;
      this._users = memStorage;
    } else if (this._config.backend === 'postgres' && !db) {
      console.warn('[StorageFacade] DATABASE_URL not set - falling back to JSON backend');
      const candidatePath = this._config.dataDir
        ? `${this._config.dataDir}/candidates.json`
        : undefined;
      const jobsPath = this._config.dataDir
        ? `${this._config.dataDir}/search-jobs.json`
        : undefined;
      this._candidates = new CandidateJsonAdapter({ filePath: candidatePath });
      this._searchJobs = new SearchJobJsonAdapter({ filePath: jobsPath });
      this._targetAddresses = memStorage;
      this._users = memStorage;
    } else {
      this._candidates = memStorage;
      this._searchJobs = memStorage;
      this._targetAddresses = memStorage;
      this._users = memStorage;
    }

    if (oceanPersistence.isPersistenceAvailable()) {
      this._oceanProbes = {
        insertProbes: (probes) => oceanPersistence.insertProbes(probes),
        queryProbesByPhiKappa: (range, limit) => oceanPersistence.queryProbesByPhiKappa(range, limit),
        queryProbesByRegime: (regime, limit) => oceanPersistence.queryProbesByRegime(regime, limit),
        getHighPhiProbes: (minPhi, limit) => oceanPersistence.getHighPhiProbes(minPhi, limit),
        getProbeCount: () => oceanPersistence.getProbeCount(),
      };
      
      this._testedPhrases = {
        markTested: (phrase) => oceanPersistence.markTested(phrase),
        batchMarkTested: (phrases) => oceanPersistence.batchMarkTested(phrases),
        hasBeenTested: (phrase) => oceanPersistence.hasBeenTested(phrase),
        flushTestedPhrases: () => oceanPersistence.flushTestedPhrases(),
      };
    }

    console.log(`[StorageFacade] Initialized with backend: ${this._config.backend}`);
  }

  get config(): StorageConfig {
    return { ...this._config };
  }

  get candidates(): ICandidateStorage {
    return this._candidates;
  }

  get targetAddresses(): ITargetAddressStorage {
    return this._targetAddresses;
  }

  get searchJobs(): ISearchJobStorage {
    return this._searchJobs;
  }

  get users(): IUserStorage {
    return this._users;
  }

  get oceanProbes(): IOceanProbeStorage | null {
    return this._oceanProbes;
  }

  get testedPhrases(): ITestedPhraseStorage | null {
    return this._testedPhrases;
  }

  isOceanPersistenceAvailable(): boolean {
    return this._oceanProbes !== null;
  }

  getLegacyStorage() {
    return memStorage;
  }
}

export const storageFacade = new StorageFacade({ backend: 'postgres' });
