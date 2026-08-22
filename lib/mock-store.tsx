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
import {
  createInquiry,
  deleteInquiry,
  subscribeInquiries,
  updateInquiryStatusRemote,
  type InquiryInput,
} from "@/lib/firestore/inquiries";
import { inquiries as seedInquiries } from "@/lib/mock-data/inquiries";
import { properties as seedPropertiesList } from "@/lib/mock-data/properties";
import type { Inquiry, InquiryStatus, Property } from "@/lib/types";

interface MockStoreContextValue {
  properties: Property[];
  inquiries: Inquiry[];
  inquiriesLoading: boolean;
  inquiriesError: string | null;
  usingFirestoreInquiries: boolean;
  addProperty: (property: Property) => Promise<void>;
  updateProperty: (id: string, patch: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addInquiry: (input: InquiryInput) => Promise<string>;
  updateInquiryStatus: (id: string, status: InquiryStatus) => Promise<void>;
  removeInquiry: (id: string) => Promise<void>;
}

const MockStoreContext = createContext<MockStoreContextValue | undefined>(undefined);

export function MockStoreProvider({ children }: { children: ReactNode }) {
  // Properties stay on mock data this pass — do not sync from Firestore.
  const [properties, setProperties] = useState<Property[]>(seedPropertiesList);
  const [inquiryState, setInquiryState] = useState<Inquiry[]>(seedInquiries);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);
  const [usingFirestoreInquiries, setUsingFirestoreInquiries] = useState(false);

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

  const addProperty = useCallback(async (property: Property) => {
    setProperties((current) => {
      const without = current.filter((item) => item.id !== property.id);
      return [property, ...without];
    });
  }, []);

  const updateProperty = useCallback(async (id: string, patch: Partial<Property>) => {
    setProperties((current) =>
      current.map((property) => (property.id === id ? { ...property, ...patch, id } : property)),
    );
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    setProperties((current) => current.filter((property) => property.id !== id));
  }, []);

  const addInquiry = useCallback(async (input: InquiryInput) => {
    // TODO: Configure Firestore security rules before production.
    if (isFirebaseConfigured()) {
      try {
        return await createInquiry(input);
      } catch (error) {
        console.error(error);
        toast.error("Could not save inquiry to Firestore.");
        throw error;
      }
    }

    const id = `inq-${Date.now()}`;
    setInquiryState((current) => [
      {
        id,
        propertyId: input.propertyId,
        buyerId: input.buyerId,
        channel: input.channel,
        notes: input.notes,
        status: input.status ?? "NEW",
        assignedSalesId: input.assignedSalesId,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    return id;
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

  const value = useMemo(
    () => ({
      properties,
      inquiries: inquiryState,
      inquiriesLoading,
      inquiriesError,
      usingFirestoreInquiries,
      addProperty,
      updateProperty,
      deleteProperty,
      addInquiry,
      updateInquiryStatus,
      removeInquiry,
    }),
    [
      properties,
      inquiryState,
      inquiriesLoading,
      inquiriesError,
      usingFirestoreInquiries,
      addProperty,
      updateProperty,
      deleteProperty,
      addInquiry,
      updateInquiryStatus,
      removeInquiry,
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
