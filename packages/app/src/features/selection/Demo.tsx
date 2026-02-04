import { Selection } from ".";

type TreeItem = {
  id: string;
  content: string;
  children?: TreeItem[];
};

const initialItems: TreeItem[] = [
  {
    id: "1",
    content: "プロジェクト計画",
    children: [
      {
        id: "2",
        content: "要件定義",
        children: [
          { id: "3", content: "機能要件の洗い出し" },
          { id: "4", content: "非機能要件の整理" },
          { id: "5", content: "ステークホルダー分析" },
        ],
      },
      {
        id: "6",
        content: "設計フェーズ",
        children: [
          { id: "7", content: "アーキテクチャ設計" },
          { id: "8", content: "データベース設計" },
          { id: "9", content: "API設計" },
          { id: "10", content: "UI/UXデザイン" },
        ],
      },
      {
        id: "11",
        content: "実装フェーズ",
        children: [
          {
            id: "12",
            content: "フロントエンド開発",
            children: [
              { id: "13", content: "コンポーネント設計" },
              { id: "14", content: "状態管理" },
              { id: "15", content: "ルーティング" },
            ],
          },
          {
            id: "16",
            content: "バックエンド開発",
            children: [
              { id: "17", content: "認証・認可" },
              { id: "18", content: "APIエンドポイント" },
              { id: "19", content: "データ永続化" },
            ],
          },
          {
            id: "20",
            content: "インフラ構築",
            children: [
              { id: "21", content: "CI/CDパイプライン" },
              { id: "22", content: "監視・ロギング" },
            ],
          },
        ],
      },
      {
        id: "23",
        content: "テストと品質保証",
        children: [
          { id: "24", content: "ユニットテスト" },
          { id: "25", content: "統合テスト" },
          { id: "26", content: "E2Eテスト" },
          { id: "27", content: "パフォーマンステスト" },
        ],
      },
      {
        id: "28",
        content: "リリース準備",
        children: [
          { id: "29", content: "ドキュメント作成" },
          { id: "30", content: "デプロイ手順確認" },
        ],
      },
    ],
  },
];

function OutlineItem({
  item,
  depth = 0,
  ancestorSelected = false,
}: {
  item: TreeItem;
  depth?: number;
  ancestorSelected?: boolean;
}) {
  return (
    <Selection.Group id={item.id}>
      {({ isSelected }) => {
        const highlighted = isSelected || ancestorSelected;
        return (
          <>
            <Selection.Item id={item.id}>
              <div
                style={{
                  padding: "5px 20px",
                  paddingLeft: `${20 + depth * 24}px`,
                  display: "flex",
                  alignItems: "center",
                  borderLeft: highlighted ? "3px solid #667eea" : "3px solid transparent",
                  background: highlighted
                    ? "linear-gradient(90deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.05) 100%)"
                    : "transparent",
                  transition: "all 0.1s ease",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: highlighted ? "#667eea" : "#d0d0d0",
                    marginRight: 12,
                    flexShrink: 0,
                    transform: highlighted ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.1s ease",
                  }}
                />
                <span
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    fontSize: 14,
                    color: highlighted ? "#4a5568" : "#333",
                    fontWeight: highlighted ? 500 : 400,
                    lineHeight: 1.5,
                    outline: "none",
                    flex: 1,
                  }}
                >
                  {item.content}
                </span>
              </div>
            </Selection.Item>
            {item.children?.map((child) => (
              <OutlineItem
                key={child.id}
                item={child}
                depth={depth + 1}
                ancestorSelected={highlighted}
              />
            ))}
          </>
        );
      }}
    </Selection.Group>
  );
}

/**
 * @public
 */
export default function Demo() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "40px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "white",
              margin: "0 0 8px 0",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Multi-Select Outliner
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", margin: 0 }}>
            Workflowy-style drag selection
          </p>
        </header>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          <Selection.Area threshold={16}>
            <div style={{ padding: "12px 0", maxHeight: 400, overflowY: "auto" }}>
              {initialItems.map((item) => (
                <OutlineItem key={item.id} item={item} />
              ))}
            </div>
          </Selection.Area>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            padding: 16,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            使い方
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            アイテムをクリックしてドラッグすると複数選択できます。
            <br />
            要素から出た瞬間にその要素が選択されます。
          </div>
        </div>
      </div>
    </div>
  );
}
