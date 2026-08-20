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
import { seedProperties, subscribeProperties, upsertProperty } from "@/lib/firestore/properties";
import { inquiries as seedInquiries } from "@/lib/mock-data/inquiries";
import { properties as seedPropertiesList } from "@/lib/mock-data/properties";
import type { Inquiry, InquiryStatus, Property } from "@/lib/types";

interface MockStoreContextValue {
  properties: Property[];
  inquiries: Inquiry[];
  usingFirestore: boolean;
  addProperty: (property: Property) => Promise<void>;
  addInquiry: (inquiry: Inquiry) => void;
  updateInquiryStatus: (id: string, status: InquiryStatus) => void;
  seedFirestoreProperties: () => Promise<void>;
}

const MockStoreContext = createContext<MockStoreContextValue | undefined>(undefined);

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(seedPropertiesList);
  const [inquiryState, setInquiryState] = useState<Inquiry[]>(seedInquiries);
  const [usingFirestore, setUsingFirestore] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUsingFirestore(false);
      return;
    }

    setUsingFirestore(true);
    const unsub = subscribeProperties(
      (next) => {
        if (next.length > 0) setProperties(next);
      },
      (error) => {
        console.error("Firestore properties subscription failed", error);
        toast.error("Could not load properties from Firestore.");
        setUsingFirestore(false);
      },
    );

    return () => unsub?.();
  }, []);

  const addProperty = useCallback(async (property: Property) => {
    if (isFirebaseConfigured()) {
      await upsertProperty(property);
      return;
    }
    setProperties((current) => [property, ...current]);
  }, []);

  const addInquiry = useCallback((inquiry: Inquiry) => {
    setInquiryState((current) => [inquiry, ...current]);
  }, []);

  const updateInquiryStatus = useCallback((id: string, status: InquiryStatus) => {
    setInquiryState((current) =>
      current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status } : inquiry)),
    );
  }, []);

  const seedFirestoreProperties = useCallback(async () => {
    if (!isFirebaseConfigured()) throw new Error("Add Firebase env vars first");
    const count = await seedProperties(seedPropertiesList);
    if (count === 0) toast.message("Firestore properties already seeded.");
    else toast.success(`Seeded ${count} properties to Firestore.`);
  }, []);

  const value = useMemo(
    () => ({
      properties,
      inquiries: inquiryState,
      usingFirestore,
      addProperty,
      addInquiry,
      updateInquiryStatus,
      seedFirestoreProperties,
    }),
    [
      properties,
      inquiryState,
      usingFirestore,
      addProperty,
      addInquiry,
      updateInquiryStatus,
      seedFirestoreProperties,
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
