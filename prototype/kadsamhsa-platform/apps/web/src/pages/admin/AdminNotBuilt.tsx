import { AdminPage } from './AdminLayout';

interface AdminNotBuiltProps {
  title: string;
  milestone: string;
  scope: string[];
}

/**
 * Placeholder for a back-office section that is in the agreed wireframe but
 * whose backend is not in this milestone.
 *
 * It exists so the sidebar can show the real shape of the product without any
 * item silently dead-ending, and so what is missing is stated plainly rather
 * than mocked up with fake data that a reviewer might mistake for working.
 */
export function AdminNotBuilt({ title, milestone, scope }: AdminNotBuiltProps) {
  return (
    <AdminPage title={title} subtitle={`Planned for ${milestone}`}>
      <div className="kadsamhsa-admin__notbuilt">
        <h2>Not built yet</h2>
        <p>
          This section is in the approved wireframe but has no backend in this milestone.
          Nothing here is mocked — it is listed so the shape of the back office is visible.
        </p>
        <p>
          <strong>What it will cover:</strong>
        </p>
        <ul>
          {scope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </AdminPage>
  );
}
