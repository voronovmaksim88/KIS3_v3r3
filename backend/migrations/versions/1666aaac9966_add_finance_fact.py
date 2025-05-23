"""add finance fact

Revision ID: 1666aaac9966
Revises: e40be29886a1
Create Date: 2025-05-06 06:09:18.041539

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1666aaac9966'
down_revision: Union[str, None] = 'e40be29886a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('orders', sa.Column('materials_cost_fact', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('products_cost_fact', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('work_cost_fact', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('debt_fact', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('orders', 'debt_fact')
    op.drop_column('orders', 'work_cost_fact')
    op.drop_column('orders', 'products_cost_fact')
    op.drop_column('orders', 'materials_cost_fact')
    # ### end Alembic commands ###
