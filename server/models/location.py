from server.extensions import db
from . import BaseModel
from sqlalchemy import ForeignKey
from .location_tag import location_tags

class Location(BaseModel):  # Inherits all BaseModel fields and methods
    __tablename__ = 'locations'
    
    name = db.Column(db.String(100), nullable=False)
    google_place_id = db.Column(db.String(100), unique=True, nullable=False)  # For Google Places API
    latitude = db.Column(db.Float, nullable=False)  # For map plotting
    longitude = db.Column(db.Float, nullable=False)  # For map plotting
    place_type = db.Column(db.String(50), nullable=False)  # Type of place (restaurant, cafe, etc.)
    address = db.Column(db.String(200))  # Full address
    rating = db.Column(db.Float)  # Overall rating from Google
    
    # Relationships
    reviews = db.relationship('Review', back_populates='location')
    tags = db.relationship('Tag', secondary=location_tags, back_populates='locations')
    collections = db.relationship('Collection', secondary='collection_locations')

    def to_dict(self):
        """Convert location to dictionary for JSON response"""
        return {
            'id': self.id,
            'name': self.name,
            'google_place_id': self.google_place_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'place_type': self.place_type,
            'address': self.address,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'reviews': [review.to_dict() for review in self.reviews],
            'tags': [tag.to_dict() for tag in self.tags],
            'collections': [collection.to_dict() for collection in self.collections]
        }
   