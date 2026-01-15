import { AUTH_CONFIG } from '@/config/constants'
import type { User, UserCompany, UserLogin } from '../types/auth.types'

const DB_NAME = 'factoryManagementDB'
const DB_VERSION = 1
const AUTH_STORE = 'auth'

export interface AuthDataLogin {
  id: string
  user: UserLogin
  access: string
  refresh: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

export interface AuthData {
  id: string
  user: User
  permissions: string[]
  currentCompany: UserCompany | null
  access: string
  refresh: string
  accessExpiresAt: number
  refreshExpiresAt: number
  updatedAt: number
}
class IndexedDBService {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create auth store if it doesn't exist
        if (!db.objectStoreNames.contains(AUTH_STORE)) {
          db.createObjectStore(AUTH_STORE, { keyPath: 'id' })
        }
      }
    })

    return this.dbPromise
  }

  async saveAuthDataLogin(data: AuthDataLogin): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(AUTH_STORE, 'readwrite')
      const store = transaction.objectStore(AUTH_STORE)

      const authDataLogin: AuthDataLogin = {
        id: AUTH_CONFIG.userKey,
        user: data.user,
        access: data.access,
        refresh: data.refresh,
        accessExpiresAt: data.accessExpiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(authDataLogin)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to save login auth data to IndexedDB:', error)
      throw error
    }
  }

  async saveAuthData(data: Omit<AuthData, 'id' | 'updatedAt'>): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(AUTH_STORE, 'readwrite')
      const store = transaction.objectStore(AUTH_STORE)

      const authData: AuthData = {
        id: AUTH_CONFIG.userKey,
        ...data,
        updatedAt: Date.now(),
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(authData)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to save auth data to IndexedDB:', error)
      throw error
    }
  }

  async getAuthData(): Promise<AuthData | AuthDataLogin | null> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(AUTH_STORE, 'readonly')
      const store = transaction.objectStore(AUTH_STORE)

      return new Promise((resolve, reject) => {
        const request = store.get(AUTH_CONFIG.userKey)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get auth data from IndexedDB:', error)
      return null
    }
  }

  async getPermissions(): Promise<string[]> {
    const authData = await this.getAuthData()
    return (authData as AuthData)?.permissions || []
  }

  async getUser(): Promise<User | null> {
    const authData = await this.getAuthData()
    return (authData as AuthData)?.user || null
  }

  async getCurrentCompany(): Promise<UserCompany | null> {
    const authData = await this.getAuthData()
    return (authData as AuthData)?.currentCompany || null
  }

  async updateUser(user: User): Promise<void> {
    const authData = await this.getAuthData()
    if (authData) {
      // Ensure all required fields are present (handle partial data from saveAuthDataLogin)
      await this.saveAuthData({
        user,
        permissions: user.permissions || (authData as AuthData).permissions || [],
        currentCompany:
          (authData as AuthData).currentCompany ||
          user.companies?.find((c) => c.is_default) ||
          user.companies?.[0] ||
          null,
        access: authData.access,
        refresh: authData.refresh,
        accessExpiresAt: authData.accessExpiresAt,
        refreshExpiresAt: authData.refreshExpiresAt,
      })
    } else {
      // If no auth data exists, create new entry (shouldn't happen, but handle gracefully)
      console.warn('Attempted to update user but no auth data exists in IndexedDB')
    }
  }

  async updatePermissions(permissions: string[]): Promise<void> {
    const authData = await this.getAuthData()
    if (authData) {
      await this.saveAuthData({
        user: (authData as AuthData).user || (authData as AuthDataLogin).user,
        permissions,
        currentCompany: (authData as AuthData).currentCompany || null,
        access: authData.access,
        refresh: authData.refresh,
        accessExpiresAt: authData.accessExpiresAt,
        refreshExpiresAt: authData.refreshExpiresAt,
      })
    }
  }

  async updateCurrentCompany(company: UserCompany | null): Promise<void> {
    const authData = await this.getAuthData()
    if (authData) {
      await this.saveAuthData({
        user: (authData as AuthData).user || (authData as AuthDataLogin).user,
        permissions: (authData as AuthData).permissions || [],
        currentCompany: company,
        access: authData.access,
        refresh: authData.refresh,
        accessExpiresAt: authData.accessExpiresAt,
        refreshExpiresAt: authData.refreshExpiresAt,
      })
    }
  }

  async updateTokens(
    access: string,
    refresh: string,
    accessExpiresAt: number,
    refreshExpiresAt: number
  ): Promise<void> {
    const authData = await this.getAuthData()
    if (authData) {
      // Ensure all required fields are present (handle partial data from saveAuthDataLogin)
      await this.saveAuthData({
        user: (authData as AuthData).user || (authData as AuthDataLogin).user,
        permissions: (authData as AuthData).permissions || [],
        currentCompany: (authData as AuthData).currentCompany || null,
        access,
        refresh,
        accessExpiresAt,
        refreshExpiresAt,
      })
    } else {
      // If no auth data exists, create minimal entry (shouldn't happen, but handle gracefully)
      console.warn('Attempted to update tokens but no auth data exists in IndexedDB')
    }
  }

  async getAccessTokenExpiry(): Promise<number> {
    const authData = await this.getAuthData()
    return authData?.accessExpiresAt || 0
  }

  async getRefreshTokenExpiry(): Promise<number> {
    const authData = await this.getAuthData()
    return authData?.refreshExpiresAt || 0
  }

  async getAccessToken(): Promise<string> {
    const authData = await this.getAuthData()
    return authData?.access || ''
  }

  async getRefreshToken(): Promise<string> {
    const authData = await this.getAuthData()
    return authData?.refresh || ''
  }

  async clearAuthData(): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(AUTH_STORE, 'readwrite')
      const store = transaction.objectStore(AUTH_STORE)

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(AUTH_CONFIG.userKey)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to clear auth data from IndexedDB:', error)
    }
  }

  async isTokenExpired(): Promise<boolean> {
    const expiry = await this.getAccessTokenExpiry()
    if (!expiry) return true

    // Consider token expired if within refresh threshold
    return Date.now() >= expiry - AUTH_CONFIG.refreshThreshold
  }

  async isTokenExpiredCompletely(): Promise<boolean> {
    const expiry = await this.getAccessTokenExpiry()
    if (!expiry) return true
    return Date.now() >= expiry
  }
}

export const indexedDBService = new IndexedDBService()
