"""Add aura color fields to User model

Revision ID: 6f98621860ca
Revises: f42e446def0c
Create Date: 2025-04-08 14:20:15.083237

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6f98621860ca'
down_revision = 'f42e446def0c'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('aura_color1', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('aura_color2', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('aura_color3', sa.String(length=20), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('aura_color3')
        batch_op.drop_column('aura_color2')
        batch_op.drop_column('aura_color1')

    # ### end Alembic commands ###
