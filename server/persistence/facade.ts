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
 * The facade uses concrete Postgres adapters that implement the domain
 * interfaces. New modules should depend on the facade, not on storage.ts
 * or ocean-persistence.ts directly.
 */

import type {
  ICandidateStorage,
  ITargetAddressStorage,
  IUserStorage,
  IOceanProbeStorage,
  ITestedPhraseStorage,
  ISearchJobStorage,
  StorageConfig,
} from './interfaces';
import {
  CandidatePostgresAdapter,
  TargetAddressPostgresAdapter,
  UserPostgresAdapter,
} from './adapters';
import { db } from '../db';
import { oceanPersistence } from '../ocean/ocean-persistence';

class StorageFacade {
  private _candidates: ICandidateStorage;
  private _targetAddresses: ITargetAddressStorage;
  private _users: IUserStorage;
  private _oceanProbes: IOceanProbeStorage | null = null;
  private _testedPhrases: ITestedPhraseStorage | null = null;
  private _searchJobs: ISearchJobStorage;
  private _config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this._config = {
      backend: config?.backend ?? 'postgres',
      dataDir: config?.dataDir,
    };

    if (this._config.backend !== 'postgres') {
      throw new Error('[StorageFacade] Only postgres backend is supported. Set backend to "postgres".');
    }

    if (!db) {
      throw new Error('[StorageFacade] DATABASE_URL not set - postgres backend is required for persistence');
    }

    this._candidates = new CandidatePostgresAdapter();
    this._targetAddresses = new TargetAddressPostgresAdapter();
    this._users = new UserPostgresAdapter();
    
    this._searchJobs = {
      getSearchJobs: async () => [],
      getSearchJob: async () => null,
      addSearchJob: async () => {},
      updateSearchJob: async () => {},
      appendJobLog: async () => {},
      deleteSearchJob: async () => {},
    };

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

  get users(): IUserStorage {
    return this._users;
  }

  get oceanProbes(): IOceanProbeStorage | null {
    return this._oceanProbes;
  }

  get testedPhrases(): ITestedPhraseStorage | null {
    return this._testedPhrases;
  }

  get searchJobs(): ISearchJobStorage {
    return this._searchJobs;
  }

  isOceanPersistenceAvailable(): boolean {
    return this._oceanProbes !== null;
  }
}

export const storageFacade = new StorageFacade({ backend: 'postgres' });
