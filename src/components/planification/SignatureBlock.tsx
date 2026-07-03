import type { SignatureBlockData } from "@/modules/audit/audit.service";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SignatureBlock({ data }: { data: SignatureBlockData }) {
  return (
    <div style={{
      marginTop: 28,
      border: "1.5px solid #002753",
      borderRadius: 8,
      overflow: "hidden",
      fontSize: "0.76rem",
      fontFamily: "inherit",
    }}>
      {/* Sección docentes */}
      <div style={{ background: "#002753", color: "white", padding: "7px 16px", fontWeight: 700, fontSize: "0.78rem" }}>
        Enviado para revisión por los docentes:
      </div>
      <div style={{ padding: "10px 16px", borderBottom: "1.5px solid #002753" }}>
        <div style={{ fontWeight: 600 }}>
          {data.teacherNames.length > 0 ? data.teacherNames.join(" · ") : "—"}
        </div>
        <div style={{ color: "#64748b", marginTop: 3 }}>
          Fecha y hora de envío:{" "}
          <span style={{ fontWeight: 500, color: "#334155" }}>{fmtDate(data.finalizedAt)}</span>
        </div>
      </div>

      {/* Sección coordinador + administrador */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Coordinador */}
        <div style={{ padding: "10px 16px", borderRight: "1.5px solid #002753" }}>
          <div style={{ fontWeight: 700, color: "#002753", marginBottom: 6 }}>
            Enviado para firma por el coordinador:
          </div>
          <div style={{ fontWeight: 600 }}>{data.coordinatorName ?? "—"}</div>
          <div style={{ color: "#64748b", marginTop: 2 }}>
            Cédula: {data.coordinatorCedula ?? "—"}
          </div>
          <div style={{ color: "#64748b", marginTop: 3 }}>
            Fecha y hora de envío:{" "}
            <span style={{ fontWeight: 500, color: "#334155" }}>{fmtDate(data.sentForSignatureAt)}</span>
          </div>
        </div>

        {/* Administrador */}
        <div style={{ padding: "10px 16px" }}>
          <div style={{ fontWeight: 700, color: "#002753", marginBottom: 6 }}>
            Revisado y firmado por el administrador:
          </div>
          <div style={{ fontWeight: 600 }}>{data.adminName ?? "—"}</div>
          <div style={{ color: "#64748b", marginTop: 2 }}>
            Cédula: {data.adminCedula ?? "—"}
          </div>
          <div style={{ color: "#64748b", marginTop: 3 }}>
            Fecha y hora de firma:{" "}
            <span style={{ fontWeight: 500, color: "#334155" }}>{fmtDate(data.signedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
