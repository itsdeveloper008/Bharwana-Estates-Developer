"use client";

/**
 * Firebase-free store context + hook.
 * Public UI imports from here so featured cards never pull Firestore into the first paint.
 */
import { createContext, useContext } from "react";
import type {
  Developer,
  Inquiry,
  InquiryStatus,
  Property,
  Transaction,
  User,
} from "@/lib/types";

/** Opaque options — real shape lives in firestore/properties (provider only). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpsertOptions = any;
/** Opaque inquiry input — real shape lives in firestore/inquiries (provider only). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InquiryInputLike = any;

export interface MockStoreContextValue {
  properties: Property[];
  inquiries: Inquiry[];
  developers: Developer[];
  transactions: Transaction[];
  users: User[];
  inquiriesLoading: boolean;
  inquiriesError: string | null;
  inquiriesReady: boolean;
  usingFirestoreInquiries: boolean;
  usingFirestoreProperties: boolean;
  usingFirestoreUsers: boolean;
  usingFirestoreDevelopers: boolean;
  propertiesLoading: boolean;
  propertiesError: string | null;
  storeReady: boolean;
  addProperty: (property: Property, options?: UpsertOptions) => Promise<void>;
  updateProperty: (id: string, patch: Partial<Property>, options?: UpsertOptions) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addInquiry: (input: InquiryInputLike) => Promise<string>;
  updateInquiryStatus: (id: string, status: InquiryStatus) => Promise<void>;
  removeInquiry: (id: string) => Promise<void>;
  addDeveloper: (developer: Developer) => Promise<void>;
  updateDeveloper: (id: string, patch: Partial<Developer>) => Promise<void>;
  deleteDeveloper: (id: string) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  getDeveloperForUser: (userId: string) => Developer | undefined;
  addUser: (user: User) => Promise<void>;
}

export const MockStoreContext = createContext<MockStoreContextValue | undefined>(undefined);

const asyncNoop = async () => undefined;

export const BOOTSTRAP_STORE: MockStoreContextValue = {
  properties: [],
  inquiries: [],
  developers: [],
  transactions: [],
  users: [],
  inquiriesLoading: false,
  inquiriesError: null,
  inquiriesReady: false,
  usingFirestoreInquiries: false,
  usingFirestoreProperties: false,
  usingFirestoreUsers: false,
  usingFirestoreDevelopers: false,
  propertiesLoading: false,
  propertiesError: null,
  storeReady: false,
  addProperty: asyncNoop,
  updateProperty: asyncNoop,
  deleteProperty: asyncNoop,
  addInquiry: async () => "",
  updateInquiryStatus: asyncNoop,
  removeInquiry: asyncNoop,
  addDeveloper: asyncNoop,
  updateDeveloper: asyncNoop,
  deleteDeveloper: asyncNoop,
  updateTransaction: asyncNoop,
  getDeveloperForUser: () => undefined,
  addUser: asyncNoop,
};

export function useMockStore() {
  const context = useContext(MockStoreContext);
  return context ?? BOOTSTRAP_STORE;
}
