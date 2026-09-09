"""Store sign and mission mastery for the complete curriculum."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260909_0005"
down_revision = "20260905_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_progress",
        sa.Column(
            "sign_mastery",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "user_progress",
        sa.Column("completed_mission_ids", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        "user_progress",
        sa.Column("mission_scores", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    )
    op.add_column(
        "user_progress",
        sa.Column("conversation_completions_by_mission", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("user_progress", "conversation_completions_by_mission")
    op.drop_column("user_progress", "mission_scores")
    op.drop_column("user_progress", "completed_mission_ids")
    op.drop_column("user_progress", "sign_mastery")
