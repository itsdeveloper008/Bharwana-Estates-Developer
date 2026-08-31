"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import {
  createInquiry,
  deleteInquiry,
  subscribeInquiries,
  updateInquiryStatusRemote,
  type InquiryInput,
} from "@/lib/firestore/inquiries";
import {
  deleteProperty as deletePropertyRemote,
  subscribeProperties,
  upsertProperty,
} from "@/lib/firestore/properties";
import { createUserDoc, subscribeUsers } from "@/lib/firestore/users";
import { developers as seedDevelopers } from "@/lib/mock-data/developers";
import { inquiries as seedInquiries } from "@/lib/mock-data/inquiries";
import { properties as seedPropertiesList } from "@/lib/mock-data/properties";
import { transactions as seedTransactions } from "@/lib/mock-data/transactions";
import { users as seedUsers } from "@/lib/mock-data/users";
import type {
  CommissionStatus,
  Developer,
  Inquiry,
  InquiryStatus,
  Property,
  Transaction,
  User,
} from "@/lib/types";

const PROPERTIES_KEY = "bharwana_properties_v1";
const DEVELOPERS_KEY = "bharwana_developers_v1";
const TRANSACTIONS_KEY = "bharwana_transactions_v1";
const USERS_KEY = "bharwana_users_v1";

/** Purge stale mock localStorage — Firestore is the source of truth when configured. */
function purgeMockLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROPERTIES_KEY);
    localStorage.removeItem(DEVELOPERS_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(USERS_KEY);
  } catch {
    // ignore quota / private mode
  }
}

interface MockStoreContextValue {
  properties: Property[];
  inquiries: Inquiry[];
  developers: Developer[];
  transactions: Transaction[];
  users: User[];
  inquiriesLoading: boolean;
  inquiriesError: string | null;
  usingFirestoreInquiries: boolean;
  usingFirestoreProperties: boolean;
  usingFirestoreUsers: boolean;
  addProperty: (property: Property) => Promise<void>;
  updateProperty: (id: string, patch: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addInquiry: (input: InquiryInput) => Promise<string>;
  updateInquiryStatus: (id: string, status: InquiryStatus) => Promise<void>;
  removeInquiry: (id: string) => Promise<void>;
  addDeveloper: (developer: Developer) => Promise<void>;
  updateDeveloper: (id: string, patch: Partial<Developer>) => Promise<void>;
  deleteDeveloper: (id: string) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  getDeveloperForUser: (userId: string) => Developer | undefined;
  addUser: (user: User) => Promise<void>;
}

const MockStoreContext = createContext<MockStoreContextValue | undefined>(undefined);

function readJsonArray<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mergeById<T extends { id: string }>(seed: T[], stored: T[] | null): T[] {
  if (!stored?.length) return seed;
  const map = new Map<string, T>();
  for (const item of seed) map.set(item.id, item);
  for (const item of stored) map.set(item.id, item);
  return Array.from(map.values());
}

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(seedPropertiesList);
  const [developers, setDevelopers] = useState<Developer[]>(seedDevelopers);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [hydrated, setHydrated] = useState(false);
  const [inquiryState, setInquiryState] = useState<Inquiry[]>(seedInquiries);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);
  const [usingFirestoreInquiries, setUsingFirestoreInquiries] = useState(false);
  const [usingFirestoreProperties, setUsingFirestoreProperties] = useState(false);
  const [usingFirestoreUsers, setUsingFirestoreUsers] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      purgeMockLocalStorage();
      setProperties([]);
      setDevelopers(seedDevelopers);
      setTransactions(seedTransactions);
      setUsers(seedUsers);
    } else {
      setProperties(mergeById(seedPropertiesList, readJsonArray<Property>(PROPERTIES_KEY)));
      setDevelopers(mergeById(seedDevelopers, readJsonArray<Developer>(DEVELOPERS_KEY)));
      setTransactions(mergeById(seedTransactions, readJsonArray<Transaction>(TRANSACTIONS_KEY)));
      setUsers(mergeById(seedUsers, readJsonArray<User>(USERS_KEY)));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // When Firestore owns properties, skip writing them to localStorage (avoids stale overrides).
    try {
      if (!usingFirestoreProperties) {
        localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
      }
      localStorage.setItem(DEVELOPERS_KEY, JSON.stringify(developers));
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      if (!usingFirestoreUsers) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    } catch (error) {
      console.error("Could not persist mock store", error);
    }
  }, [properties, developers, transactions, users, hydrated, usingFirestoreProperties, usingFirestoreUsers]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUsingFirestoreInquiries(false);
      setInquiriesLoading(false);
      return;
    }

    setInquiriesLoading(true);
    setUsingFirestoreInquiries(true);
    const unsub = subscribeInquiries(
      (next) => {
        setInquiryState(next);
        setInquiriesLoading(false);
        setInquiriesError(null);
      },
      (error) => {
        console.error("Firestore inquiries subscription failed", error);
        setInquiriesError("Could not load inquiries from Firestore.");
        setInquiriesLoading(false);
        setUsingFirestoreInquiries(false);
      },
    );

    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUsingFirestoreProperties(false);
      return;
    }

    const unsub = subscribeProperties(
      (next) => {
        setUsingFirestoreProperties(true);
        setProperties(next);
      },
      (error) => {
        console.error("Firestore properties subscription failed", error);
        setUsingFirestoreProperties(false);
        toast.error("Could not load properties from Firestore.");
      },
    );

    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUsingFirestoreUsers(false);
      return;
    }

    const unsub = subscribeUsers(
      (next) => {
        setUsingFirestoreUsers(true);
        setUsers(next);
      },
      (error) => {
        console.error("Firestore users subscription failed", error);
        setUsingFirestoreUsers(false);
      },
    );

    return () => unsub?.();
  }, []);

  const addProperty = useCallback(async (property: Property) => {
    setProperties((current) => [property, ...current.filter((item) => item.id !== property.id)]);

    void (async () => {
      try {
        const saved = await upsertProperty(property);
        setProperties((current) =>
          current.map((item) => (item.id === property.id ? saved : item)),
        );
      } catch (error) {
        console.error(error);
        setProperties((current) => current.filter((item) => item.id !== property.id));
        toast.error(firestoreErrorMessage(error, "Could not save property to Firestore."));
      }
    })();
  }, []);

  const updateProperty = useCallback(async (id: string, patch: Partial<Property>) => {
    let merged: Property | undefined;
    setProperties((current) => {
      const existing = current.find((property) => property.id === id);
      if (!existing) return current;
      merged = { ...existing, ...patch, id };
      return current.map((property) => (property.id === id ? merged! : property));
    });
    if (!merged) return;

    if (!isFirebaseConfigured()) return;

    try {
      const saved = await upsertProperty(merged);
      setProperties((current) =>
        current.map((property) => (property.id === id ? saved : property)),
      );
    } catch (error) {
      console.error(error);
      toast.error(firestoreErrorMessage(error, "Could not update property in Firestore."));
      throw error;
    }
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    setProperties((current) => current.filter((property) => property.id !== id));
    if (isFirebaseConfigured()) {
      try {
        await deletePropertyRemote(id);
      } catch (error) {
        console.error(error);
        toast.error("Could not delete property from Firestore.");
        throw error;
      }
    }
  }, []);

  const addInquiry = useCallback(async (input: InquiryInput) => {
    const tempId = `inq-${Date.now()}`;
    const optimistic: Inquiry = {
      id: tempId,
      propertyId: input.propertyId,
      buyerId: input.buyerId,
      channel: input.channel,
      notes: input.notes,
      status: input.status ?? "NEW",
      assignedSalesId: input.assignedSalesId,
      createdAt: new Date().toISOString(),
    };
    setInquiryState((current) => [optimistic, ...current]);

    if (!isFirebaseConfigured()) return tempId;

    void (async () => {
      try {
        const id = await createInquiry(input);
        const saved: Inquiry = { ...optimistic, id };
        setInquiryState((current) =>
          current.map((item) => (item.id === tempId ? saved : item)),
        );
      } catch (error) {
        console.error(error);
        toast.error(firestoreErrorMessage(error, "Could not save inquiry to Firestore."));
      }
    })();

    return tempId;
  }, []);

  const updateInquiryStatus = useCallback(async (id: string, status: InquiryStatus) => {
    setInquiryState((current) =>
      current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry)),
    );
    if (isFirebaseConfigured()) {
      try {
        await updateInquiryStatusRemote(id, status);
      } catch (error) {
        console.error(error);
        toast.error("Could not update inquiry in Firestore.");
      }
    }
  }, []);

  const removeInquiry = useCallback(async (id: string) => {
    setInquiryState((current) => current.filter((inquiry) => inquiry.id !== id));
    if (isFirebaseConfigured()) {
      try {
        await deleteInquiry(id);
      } catch (error) {
        console.error(error);
        toast.error("Could not delete inquiry from Firestore.");
        throw error;
      }
    }
  }, []);

  const addDeveloper = useCallback(async (developer: Developer) => {
    setDevelopers((current) => {
      const without = current.filter((item) => item.id !== developer.id);
      return [developer, ...without];
    });
  }, []);

  const updateDeveloper = useCallback(async (id: string, patch: Partial<Developer>) => {
    setDevelopers((current) =>
      current.map((developer) => (developer.id === id ? { ...developer, ...patch, id } : developer)),
    );
  }, []);

  const deleteDeveloper = useCallback(async (id: string) => {
    setDevelopers((current) => current.filter((developer) => developer.id !== id));
  }, []);

  const updateTransaction = useCallback(async (id: string, patch: Partial<Transaction>) => {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, ...patch, id } : tx)),
    );
  }, []);

  const getDeveloperForUser = useCallback(
    (userId: string) => developers.find((developer) => developer.dealerUserId === userId),
    [developers],
  );

  const addUser = useCallback(async (user: User) => {
    setUsers((current) => {
      const without = current.filter((item) => item.id !== user.id);
      return [user, ...without];
    });
    if (isFirebaseConfigured()) {
      try {
        await createUserDoc(user.id, {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatarUrl,
        });
      } catch (error) {
        console.error(error);
        toast.error("Could not save user profile to Firestore.");
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      properties,
      inquiries: inquiryState,
      developers,
      transactions,
      users,
      inquiriesLoading,
      inquiriesError,
      usingFirestoreInquiries,
      usingFirestoreProperties,
      usingFirestoreUsers,
      addProperty,
      updateProperty,
      deleteProperty,
      addInquiry,
      updateInquiryStatus,
      removeInquiry,
      addDeveloper,
      updateDeveloper,
      deleteDeveloper,
      updateTransaction,
      getDeveloperForUser,
      addUser,
    }),
    [
      properties,
      inquiryState,
      developers,
      transactions,
      users,
      inquiriesLoading,
      inquiriesError,
      usingFirestoreInquiries,
      usingFirestoreProperties,
      usingFirestoreUsers,
      addProperty,
      updateProperty,
      deleteProperty,
      addInquiry,
      updateInquiryStatus,
      removeInquiry,
      addDeveloper,
      updateDeveloper,
      deleteDeveloper,
      updateTransaction,
      getDeveloperForUser,
      addUser,
    ],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) {
    throw new Error("useMockStore must be used within MockStoreProvider");
  }
  return context;
}

export function sumCommission(
  items: Transaction[],
  statuses?: CommissionStatus[],
): number {
  return items
    .filter((tx) => !statuses || statuses.includes(tx.commissionStatus))
    .reduce((sum, tx) => sum + tx.commissionAmount, 0);
}
