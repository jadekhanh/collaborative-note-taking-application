import { useNavigate, useParams } from "react-router-dom";
import Editor from "../components/editor/Editor";

/**
 * Shared page section: pages shared with user
 * Opens one directly shared page without requiring access to the shared page's entire workspace
 */
const SharedPage = () => {
  const navigate = useNavigate();
  const { pageId } = useParams();

  return (
    <div className="shared-page">
      <button type="button" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>

      <Editor
        pageId={pageId}
        onPageUpdated={() => {}}
        onPageArchive={() => navigate("/dashboard")}
        onPageDeleted={() => navigate("/dashboard")}
      />
    </div>
  );
};

export default SharedPage;
