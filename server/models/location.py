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
    
    # Additional fields
    phone = db.Column(db.String(50), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    price_level = db.Column(db.Integer, nullable=True)
    user_ratings_total = db.Column(db.Integer, nullable=True)
    area = db.Column(db.String(100), nullable=True)
    
    # Direct aura fields for simpler access
    aura_name = db.Column(db.String(100), nullable=True)
    aura_color = db.Column(db.String(255), nullable=True)  # Store gradient CSS
    aura_shape = db.Column(db.String(50), nullable=True)   # Shape name: soft, pulse, flowing, sparkle
    
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
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'phone': self.phone,
            'website': self.website,
            'price_level': self.price_level,
            'user_ratings_total': self.user_ratings_total,
            'area': self.area
        }
        
        # Add aura information - prioritize direct fields if they exist
        if self.aura_name and self.aura_color and self.aura_shape:
            location_dict['aura'] = {
                'name': self.aura_name,
                'color': self.aura_color,
                'shape': self.aura_shape
            }
            
            # Extract aura colors for frontend
            if self.aura_color and 'gradient' in self.aura_color:
                # Extract hex colors from gradient string
                import re
                color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', self.aura_color)
                if len(color_matches) >= 2:
                    location_dict['aura_color1'] = color_matches[0]
                    location_dict['aura_color2'] = color_matches[1]
            
            # Always set raw aura_color
            location_dict['aura_color'] = self.aura_color
            
        # Fall back to tags relationship if direct fields aren't populated
        elif self.tags:
            # Use the first tag as the aura
            aura_tag = self.tags[0]
            location_dict['aura'] = {
                'name': aura_tag.name,
                'color': aura_tag.color,
                'shape': aura_tag.shape
            }
            
            # Extract aura colors for frontend
            if aura_tag.color and 'gradient' in aura_tag.color:
                # Extract hex colors from gradient string
                import re
                color_matches = re.findall(r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}', aura_tag.color)
                if len(color_matches) >= 2:
                    location_dict['aura_color1'] = color_matches[0]
                    location_dict['aura_color2'] = color_matches[1]
            
            # Always set raw aura_color
            location_dict['aura_color'] = aura_tag.color
        
        return location_dict
   