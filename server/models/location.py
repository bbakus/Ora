from server.extensions import db
from server.models.location_tag import location_tags
from datetime import datetime

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    google_place_id = db.Column(db.String(255), unique=True, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    place_type = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    rating = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define the many-to-many relationship with tags (auras)
    tags = db.relationship('Tag', secondary=location_tags, lazy='subquery',
                          back_populates='locations')
    
    # Define the one-to-many relationship with reviews
    reviews = db.relationship('Review', back_populates='location', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Location {self.name} at {self.latitude},{self.longitude}>'
    
    def to_dict(self):
        """Convert location to dictionary for API responses"""
        location_dict = {
            'id': self.id,
            'name': self.name,
            'google_place_id': self.google_place_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'place_type': self.place_type,
            'address': self.address,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Add aura information if tags exist
        if self.tags:
            # Use the first tag as the aura
            aura_tag = self.tags[0]
            location_dict['aura'] = {
                'name': aura_tag.name,
                'color': aura_tag.color,
                'shape': aura_tag.shape
            }
        
        return location_dict
   