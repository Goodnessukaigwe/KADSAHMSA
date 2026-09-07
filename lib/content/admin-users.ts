export type AccountKind = "individual" | "organisation";
export type AccountStatus = "active" | "pending";

export type AdminAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  course: string;
  done: number;
  total: number;
  status: AccountStatus;
  email: string;
  phone: string;
  location: string;
  joined: string;
};

export type ActivityItem = {
  id: string;
  label: string;
  when: string;
  tone: "event" | "approved";
};

const DPTC = "DPTC Sensitization";

const seed: AdminAccount[] = [
  {
    id: "amina-hassan",
    name: "Amina Hassan",
    kind: "individual",
    course: DPTC,
    done: 18,
    total: 23,
    status: "active",
    email: "amina.hassan@example.com",
    phone: "+234 803 555 0198",
    location: "Kaduna, Nigeria",
    joined: "12 Feb 2026",
  },
  {
    id: "chidi-uchehara",
    name: "Chidi Uchehara",
    kind: "individual",
    course: DPTC,
    done: 18,
    total: 23,
    status: "active",
    email: "chidi.uchehara@kaduna.gov.ng",
    phone: "+234 802 441 2201",
    location: "Kaduna, Nigeria",
    joined: "4 Mar 2026",
  },
  {
    id: "aisha-bello",
    name: "Aisha Bello",
    kind: "individual",
    course: DPTC,
    done: 13,
    total: 23,
    status: "active",
    email: "aisha.bello@kadsamhsa.ng",
    phone: "+234 809 112 3344",
    location: "Kaduna, Nigeria",
    joined: "18 Jan 2026",
  },
  {
    id: "musa-ibrahim",
    name: "Musa Ibrahim",
    kind: "individual",
    course: DPTC,
    done: 9,
    total: 23,
    status: "active",
    email: "musa.ibrahim@kaduna.gov.ng",
    phone: "+234 806 778 9012",
    location: "Zaria, Kaduna",
    joined: "22 Jan 2026",
  },
  {
    id: "chinedu-okeke",
    name: "Chinedu Okeke",
    kind: "individual",
    course: "Community First Response",
    done: 6,
    total: 8,
    status: "active",
    email: "chinedu.okeke@moh.kd.gov.ng",
    phone: "+234 701 555 0188",
    location: "Kaduna, Nigeria",
    joined: "2 Feb 2026",
  },
  {
    id: "tunde-adeyemi",
    name: "Tunde Adeyemi",
    kind: "individual",
    course: "Human Rights Frameworks",
    done: 4,
    total: 10,
    status: "active",
    email: "tunde.adeyemi@ndlea.gov.ng",
    phone: "+234 805 333 4410",
    location: "Kaduna, Nigeria",
    joined: "9 Feb 2026",
  },
  {
    id: "ngozi-eze",
    name: "Ngozi Eze",
    kind: "individual",
    course: DPTC,
    done: 21,
    total: 23,
    status: "active",
    email: "ngozi.eze@kadsamhsa.ng",
    phone: "+234 813 220 6677",
    location: "Kaduna, Nigeria",
    joined: "11 Dec 2025",
  },
  {
    id: "habiba-lawal",
    name: "Habiba Lawal",
    kind: "individual",
    course: DPTC,
    done: 7,
    total: 23,
    status: "active",
    email: "habiba.lawal@kadsamhsa.ng",
    phone: "+234 814 909 2211",
    location: "Kaduna, Nigeria",
    joined: "28 Feb 2026",
  },
  {
    id: "fatima-sule",
    name: "Fatima Sule",
    kind: "individual",
    course: DPTC,
    done: 2,
    total: 23,
    status: "pending",
    email: "fatima.sule@community.ng",
    phone: "+234 808 441 0909",
    location: "Kaduna, Nigeria",
    joined: "1 Sep 2026",
  },
  {
    id: "yahaya-bello",
    name: "Yahaya Bello",
    kind: "individual",
    course: DPTC,
    done: 1,
    total: 23,
    status: "pending",
    email: "yahaya.bello@kaduna.gov.ng",
    phone: "+234 807 660 1188",
    location: "Kaduna, Nigeria",
    joined: "3 Sep 2026",
  },
  {
    id: "ibrahim-sani",
    name: "Ibrahim Sani",
    kind: "individual",
    course: DPTC,
    done: 0,
    total: 23,
    status: "pending",
    email: "ibrahim.sani@ndlea.gov.ng",
    phone: "+234 802 119 4455",
    location: "Kaduna, Nigeria",
    joined: "5 Sep 2026",
  },
  {
    id: "kaduna-command",
    name: "Kaduna Command",
    kind: "organisation",
    course: DPTC,
    done: 86,
    total: 120,
    status: "active",
    email: "training@kaduna-command.gov.ng",
    phone: "+234 803 000 1100",
    location: "Kaduna, Nigeria",
    joined: "8 Jan 2026",
  },
  {
    id: "state-moh",
    name: "State Ministry of Health",
    kind: "organisation",
    course: DPTC,
    done: 54,
    total: 80,
    status: "active",
    email: "learning@moh.kd.gov.ng",
    phone: "+234 803 000 2200",
    location: "Kaduna, Nigeria",
    joined: "14 Jan 2026",
  },
  {
    id: "kadsamhsa-hq",
    name: "KADSAMHSA HQ",
    kind: "organisation",
    course: DPTC,
    done: 112,
    total: 140,
    status: "active",
    email: "academy@kadsamhsa.ng",
    phone: "+234 803 000 3300",
    location: "Kaduna, Nigeria",
    joined: "2 Jan 2026",
  },
  {
    id: "ndlea-northwest",
    name: "NDLEA North-West",
    kind: "organisation",
    course: "Human Rights Frameworks",
    done: 31,
    total: 60,
    status: "active",
    email: "cohort@ndlea.gov.ng",
    phone: "+234 803 000 4400",
    location: "Kaduna, Nigeria",
    joined: "20 Jan 2026",
  },
  {
    id: "community-health-partners",
    name: "Community Health Partners",
    kind: "organisation",
    course: "Community First Response",
    done: 18,
    total: 40,
    status: "active",
    email: "hello@chp-kaduna.org",
    phone: "+234 803 000 5500",
    location: "Kaduna, Nigeria",
    joined: "4 Sep 2026",
  },
];

let accounts: AdminAccount[] = seed.map((row) => ({ ...row }));
let individualsTotal = 1140;
let organisationsTotal = 1000;

export function listAdminAccounts() {
  return accounts;
}

export function getAdminAccount(id: string) {
  return accounts.find((row) => row.id === id) ?? null;
}

export function approveAdminAccount(id: string) {
  accounts = accounts.map((row) =>
    row.id === id ? { ...row, status: "active" as const } : row
  );
  return getAdminAccount(id);
}

export function inviteOrganisation(name: string, email: string) {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `org-${Date.now()}`;
  const next: AdminAccount = {
    id: accounts.some((row) => row.id === id) ? `${id}-${Date.now()}` : id,
    name: name.trim() || "New organisation",
    kind: "organisation",
    course: DPTC,
    done: 0,
    total: 40,
    status: "pending",
    email: email.trim() || "cohort@kadsamhsa.ng",
    phone: "+234 800 000 0000",
    location: "Kaduna, Nigeria",
    joined: "7 Sep 2026",
  };
  accounts = [next, ...accounts];
  organisationsTotal += 1;
  return next;
}

export function accountTotals() {
  return {
    pending: accounts.filter((row) => row.status === "pending").length,
    individuals: individualsTotal,
    organisations: organisationsTotal,
  };
}

export function accountActivity(account: AdminAccount): ActivityItem[] {
  if (account.kind === "organisation") {
    return [
      {
        id: "a1",
        label: "12 officers enrolled on DPTC Sensitization",
        when: "1 day ago",
        tone: "event",
      },
      {
        id: "a2",
        label: "Cohort report downloaded by Flora",
        when: "2 days ago",
        tone: "event",
      },
      {
        id: "a3",
        label:
          account.status === "pending"
            ? "Awaiting approval from KADSAMHSA"
            : "Account approved by Flora",
        when: "3 days ago",
        tone: "approved",
      },
    ];
  }

  if (account.status === "pending") {
    return [
      {
        id: "a1",
        label: "Requested access to DPTC Sensitization",
        when: "1 day ago",
        tone: "event",
      },
      {
        id: "a2",
        label: "Submitted organisation affiliation",
        when: "2 days ago",
        tone: "event",
      },
    ];
  }

  return [
    {
      id: "a1",
      label: "Completed “Special Populations” lesson",
      when: "1 day ago",
      tone: "event",
    },
    {
      id: "a2",
      label: "Watched “Drugs and Effects” video",
      when: "2 days ago",
      tone: "event",
    },
    {
      id: "a3",
      label: "Account approved by Flora",
      when: "3 days ago",
      tone: "approved",
    },
  ];
}

export function percentComplete(account: AdminAccount) {
  if (!account.total) return 0;
  return Math.round((account.done / account.total) * 100);
}

export function accountsToCsv(rows: AdminAccount[]) {
  const header = "Name,Type,Course,Progress,Status";
  const body = rows.map((row) =>
    [
      csvCell(row.name),
      row.kind === "organisation" ? "Organization" : "Individual",
      csvCell(row.course),
      `${row.done}/${row.total}`,
      row.status === "pending" ? "Pending Approval" : "Active",
    ].join(",")
  );
  return [header, ...body].join("\n");
}

function csvCell(value: string) {
  if (value.includes(",") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
