ASPECTS = ["guide", "price_value", "communication",
           "facilities", "access_transport", "food", "other"]

# Used only for weak labelling of Yelp. Lowercase substrings.
KEYWORDS = {
    "guide": ["guide", "host", "staff", "server", "owner", "knowledgeable"],
    "price_value": ["price", "expensive", "cheap", "worth", "value", "overpriced", "cost"],
    "communication": ["reservation", "booking", "booked", "reply", "replied", "confirm", "called", "email"],
    "facilities": ["bathroom", "restroom", "toilet", "clean", "dirty", "seating", "shade", "parking lot"],
    "access_transport": ["parking", "location", "directions", "hard to find", "drive", "road", "easy to find"],
    "food": ["food", "lunch", "breakfast", "dinner", "meal", "snack", "pastry", "menu"],
}