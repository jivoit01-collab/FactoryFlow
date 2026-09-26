import { describe, expect, it } from 'vitest';

import {
  SAP_DOCUMENTS_ACCESS,
  SAP_DOCUMENTS_DOWNLOAD_ACCESS,
  SAP_DOCUMENTS_PERMISSIONS,
} from '@/config/permissions';

import { sapDocumentsModuleConfig } from '../module.config';

describe('sap-documents module config', () => {
  it('registers the browser page', () => {
    expect(sapDocumentsModuleConfig.routes.map((route) => route.path)).toEqual(['/sap-documents']);
  });

  it('opens the page on the view right alone', () => {
    for (const route of sapDocumentsModuleConfig.routes) {
      expect(route.permissions).toEqual([SAP_DOCUMENTS_PERMISSIONS.VIEW]);
    }
    expect(SAP_DOCUMENTS_ACCESS).toEqual([SAP_DOCUMENTS_PERMISSIONS.VIEW]);
  });

  it('has its own sidebar entry, gated on the view right and never by prefix', () => {
    const items = sapDocumentsModuleConfig.navigation ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('SAP Documents');
    expect(items[0].showInSidebar).toBe(true);
    expect(items[0].modulePrefix).toBeUndefined();
    // The download right alone opens nothing, so it must not reveal the entry.
    expect(items[0].permissions).toEqual(SAP_DOCUMENTS_ACCESS);
  });

  it('asks for both rights before offering a download, as the server does', () => {
    expect([...SAP_DOCUMENTS_DOWNLOAD_ACCESS].sort()).toEqual(
      [SAP_DOCUMENTS_PERMISSIONS.VIEW, SAP_DOCUMENTS_PERMISSIONS.DOWNLOAD_ATTACHMENTS].sort(),
    );
  });

  it('names only sap_documents rights', () => {
    for (const value of Object.values(SAP_DOCUMENTS_PERMISSIONS)) {
      expect(value.startsWith('sap_documents.')).toBe(true);
    }
  });
});
