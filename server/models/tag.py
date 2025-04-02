from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey
from .location_tag import location_tags


class Tag(BaseModel):
    __tablename__ = 'tags'

    name = db.Column(db.String(50), nullable=False)  # The aura type (e.g., "vibrant", "peaceful")
    color = db.Column(db.String(7), nullable=False)  # Hex color code
    shape = db.Column(db.String(20), nullable=False)  # Shape of the aura
    
    # Relationships
    locations = db.relationship('Location', secondary=location_tags, back_populates='tags')

    def to_dict(self):
        """Convert tag to dictionary for JSON response"""
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'shape': self.shape,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'locations': [location.to_dict() for location in self.locations]
        }
