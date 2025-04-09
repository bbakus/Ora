from server.app import create_app, db
from server.models.location import Location

app = create_app()
with app.app_context():
    total_locations = Location.query.count()
    print(f"Total locations in database: {total_locations}")
    
    if total_locations > 0:
        # Print first 5 locations as a sample
        locations = Location.query.limit(5).all()
        print("\nSample locations:")
        for loc in locations:
            print(f"- {loc.name} (ID: {loc.id})")
            print(f"  Lat: {loc.latitude}, Lng: {loc.longitude}")
            print(f"  Colors: {loc.aura_color1}, {loc.aura_color2}, {loc.aura_color3}")
            print(f"  Shape: {loc.aura_shape}") 