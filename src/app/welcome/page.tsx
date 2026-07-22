import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, effectiveRole } from "@/lib/auth/roles";

// Isabelle's REQUIEM artist statement. (Light copy-fixes flagged to Emile:
// refuges→refugees, pinning's→pinnings, vessel→vessels, and one duplicated
// sentence removed — revert any if she prefers her exact wording.)
const STATEMENT: string[] = [
  "The idea of Requiem derives from my grief for the world around us — the outrageous amount of death from diseases, wars, gun violence, the displacement of refugees, the loss of biodiversity, the extinction of species and climate change. It is an elegy for the dead, the suffering, and the passage of time, along with all its hardships for humanity and the natural world. I aim to create a body of work that encompasses the pains of our fleeting and evolutionary existence on the planet.",
  "I view trees as beings that silently observe — vessels witnessing our failings. It feels natural to use them as an extension or hybrid of ourselves. I use branches and tree trunks to explore our cruelty through flesh, decay, natural science, and biology. I incorporate elements such as blood, wounds, scars, bones, fungi, mummies, fossils, botanical drawings, and insect pinnings in great detail to create an intimate connection with each piece.",
  "We are all experiencing inordinate amounts of pain and grief that is not expressed and not dealt with. This means we are all in some form of limbo — unable to move forwards, paralyzed. Until we face and acknowledge our grief we cannot make the world better.",
  "The exposed fresh flesh and wounds in the paintings are a metaphor for death and suffering in the present. The natural history elements are a metaphor for the past. Together, they are meant to mobilize us for a future: to make us reflect on how we value life and the sacrifices needed to inhabit our planet.",
  "My signature dark backgrounds, present in all my works, symbolize loneliness and the idea of looking into the abyss of hopelessness.",
  "I use minimalism to counteract the daily bombardment of images, to bring about a clean form of reflection. The fine detail is a form of respect for the viewer. I paint life size.",
];

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getSession();
  // Admins don't need the welcome — send them to the admin surface.
  if (session && effectiveRole(session) === "admin") redirect("/admin");
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <main className="welcome-wrap">
      <p className="auth-kicker">Isabelle du Toit · Requiem</p>
      <h1 className="welcome-title">
        Welcome{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="welcome-lead">
        Thank you for being here. Requiem is an ongoing body of work; below is
        the statement behind it. When you&rsquo;re ready, explore the portfolio
        &mdash; and reach out any time.
      </p>
      <div className="welcome-statement">
        {STATEMENT.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="welcome-cta">
        <Link href="/portfolio" className="welcome-btn">
          Explore the portfolio
        </Link>
        <a
          href="mailto:dutoit.isabelle@gmail.com"
          className="welcome-btn ghost"
        >
          Contact Isabelle
        </a>
      </div>
      <p className="welcome-foot">
        <Link href="/">← Return to Requiem</Link>
      </p>
    </main>
  );
}
