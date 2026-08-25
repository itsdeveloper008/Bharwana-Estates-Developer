import type { Developer } from "@/lib/types";

export const developers: Developer[] = [
  {
    id: "d-bharwana",
    companyName: "Bharwana Estates Dealer",
    contactPerson: "Imran Bharwana",
    commissionRate: 0.04,
    status: "ACTIVE",
    origin: "ADMIN",
  },
  {
    id: "d-greenfield",
    companyName: "Greenfield Holdings",
    contactPerson: "Tariq Mehmood",
    commissionRate: 0.035,
    status: "ACTIVE",
    origin: "ADMIN",
  },
  {
    id: "d-skyline",
    companyName: "Skyline Partners",
    contactPerson: "Sana Iftikhar",
    commissionRate: 0.05,
    status: "ACTIVE",
    origin: "ADMIN",
  },
  {
    id: "d-ali-realty",
    companyName: "Ali Realty",
    contactPerson: "Kamran Ali",
    commissionRate: 0.025,
    dealerUserId: "u-dealer-1",
    status: "ACTIVE",
    origin: "SELF_REGISTERED",
    registrationNumber: "34201-1234567-1",
  },
];
