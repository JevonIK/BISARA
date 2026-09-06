"""Store gesture practice attempts and the learner's best similarity score."""

from alembic import op
import sqlalchemy as sa

revision = "20260905_0004"
down_revision = "20260905_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_progress",
        sa.Column("best_gesture_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "user_progress",
        sa.Column("gesture_attempts", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("user_progress", "gesture_attempts")
    op.drop_column("user_progress", "best_gesture_score")
