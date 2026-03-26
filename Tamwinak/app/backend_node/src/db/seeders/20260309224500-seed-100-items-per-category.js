'use strict';

/**
 * Returns a random element from an array.
 */
function sample(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const CATEGORIES = {
    Fruits: {
        bases: ['Apple', 'Banana', 'Orange', 'Mango', 'Strawberry', 'Grape', 'Kiwi', 'Peach', 'Plum', 'Lemon', 'Lime', 'Cherry', 'Blueberry', 'Raspberry', 'Watermelon', 'Melon', 'Papaya', 'Pineapple', 'Pomegranate', 'Fig', 'Avocado', 'Coconut', 'Guava', 'Passionfruit', 'Grapefruit', 'Tangerine', 'Clementine'],
        adjectives: ['Organic', 'Fresh', 'Premium', 'Local', 'Imported', 'Sweet', 'Juicy', 'Ripe', 'Farm-fresh', 'Hand-picked', 'Natural', 'Sun-kissed', 'Perfect', 'Golden', 'Red', 'Green'],
        sizes: ['1kg', '500g', 'Pack of 6', 'Box', 'Loose', 'Bunch', 'Bag', '750g', '250g'],
        brands: ['Del Monte', 'Chiquita', 'Dole', 'Local Farms', 'Daily Fresh', 'Nature\'s Best']
    },
    Vegetables: {
        bases: ['Tomato', 'Cucumber', 'Onion', 'Garlic', 'Potato', 'Carrot', 'Broccoli', 'Cabbage', 'Lettuce', 'Spinach', 'Bell Pepper', 'Eggplant', 'Zucchini', 'Cauliflower', 'Mushroom', 'Celery', 'Asparagus', 'Radish', 'Pumpkin', 'Sweet Potato', 'Beetroot', 'Leek', 'Artichoke', 'Kale', 'Chili Pepper', 'Green Bean'],
        adjectives: ['Organic', 'Fresh', 'Premium', 'Local', 'Imported', 'Crisp', 'Crunchy', 'Earth-grown', 'Farm-fresh', 'Natural', 'Vibrant', 'Baby', 'Whole', 'Sliced'],
        sizes: ['1kg', '500g', '250g', 'Pack', 'Bunch', 'Bag', 'Loose', 'Net Weight 1.5kg', '3 pcs'],
        brands: ['Local Farms', 'Green House', 'Nature\'s Best', 'Harvest', 'Fresh Cuts']
    },
    Dairy: {
        bases: ['Milk', 'Yogurt', 'Cheddar Cheese', 'Mozzarella', 'Butter', 'Cream', 'Sour Cream', 'Cream Cheese', 'Cottage Cheese', 'Parmesan', 'Gouda', 'Brie', 'Blue Cheese', 'Almond Milk', 'Oat Milk', 'Soy Milk', 'Laban', 'Feta Cheese', 'Halloumi', 'Evaporated Milk', 'Condensed Milk'],
        adjectives: ['Full Fat', 'Low Fat', 'Skimmed', 'Organic', 'Fresh', 'Premium', 'Pasteurized', 'Fortified', 'Artisan', 'Rich & Creamy', 'Unsalted', 'Salted', 'Plant-based', 'Probiotic'],
        sizes: ['1L', '2L', '500ml', '200ml', '400g', '1kg', '250g', 'Pack of 4', 'Gallon', '6 pcs', '120g'],
        brands: ['Almarai', 'Nadec', 'Safi Danone', 'Puck', 'Kraft', 'President', 'Lurpak', 'Kiri', 'La Vache qui rit', 'Nada', 'Activia', 'Silk']
    },
    Bakery: {
        bases: ['Bread', 'Croissant', 'Baguette', 'Bagel', 'Muffin', 'Bun', 'Roll', 'Pita', 'Flatbread', 'Sourdough', 'Ciabatta', 'Donut', 'Cake', 'Cookie', 'Brownie', 'Tart', 'Pastry', 'Samoon', 'Tortilla', 'Burger Buns', 'Hotdog Buns'],
        adjectives: ['Freshly Baked', 'Whole Wheat', 'White', 'Multigrain', 'Gluten-Free', 'Artisan', 'Soft', 'Crusty', 'Sweet', 'Savory', 'Butter', 'Chocolate', 'Cheese', 'Bran'],
        sizes: ['1 Loaf', 'Pack of 4', 'Pack of 6', 'Pack of 12', 'Single', 'Box of 6', '500g', '3 pcs', '250g'],
        brands: ['Lusine', 'Herfy Bakery', 'Almarai', 'Yaumi', 'Fuchs', 'Daily Bread', 'Local Bakery']
    },
    Beverages: {
        bases: ['Water', 'Orange Juice', 'Apple Juice', 'Cola', 'Lemonade', 'Iced Tea', 'Coffee', 'Green Tea', 'Black Tea', 'Energy Drink', 'Sports Drink', 'Sparkling Water', 'Ginger Ale', 'Root Beer', 'Smoothie', 'Mango Juice', 'Grape Juice', 'Pineapple Juice', 'Mineral Water', 'Instant Coffee'],
        adjectives: ['Chilled', '100% Natural', 'No Added Sugar', 'Premium', 'Refreshing', 'Carbonated', 'Still', 'Organic', 'Diet', 'Zero', 'Fresh', 'Cold Pressed', 'Roasted'],
        sizes: ['330ml', '500ml', '1.5L', '2L', 'Pack of 6', 'Case of 24', '1L', '250ml', '200ml', 'Jar 200g'],
        brands: ['Pepsi', 'Coca-Cola', '7Up', 'Sprite', 'Almarai', 'Nova', 'Aquafina', 'Nestle', 'Lipton', 'Red Bull', 'Gatorade', 'Nescafé', 'Folgers', 'Rani', 'Suntop']
    },
    Snacks: {
        bases: ['Potato Chips', 'Tortilla Chips', 'Pretzels', 'Popcorn', 'Mixed Nuts', 'Almonds', 'Peanuts', 'Chocolate Bar', 'Gummy Bears', 'Cookies', 'Crackers', 'Rice Cakes', 'Protein Bar', 'Beef Jerky', 'Granola Bar', 'Cashews', 'Pistachios', 'Dates', 'Wafers', 'Marshmallows'],
        adjectives: ['Salted', 'Spicy', 'Cheese Flavored', 'BBQ', 'Sweet & Sour', 'Roasted', 'Raw', 'Dark', 'Milk', 'Crunchy', 'Chewy', 'Healthy', 'Gluten-Free', 'Caramel'],
        sizes: ['50g', '150g', '200g', 'Family Size', 'Pack of 12', 'Single Bar', '500g', '1kg', '100g', 'Multipack'],
        brands: ['Lays', 'Doritos', 'Pringles', 'Bateel', 'Galaxy', 'Snickers', 'Mars', 'Twix', 'KitKat', 'Oreo', 'Ritz', 'Cheetos', 'Bounty', 'M&Ms', 'Skittles', 'Baja']
    },
    Meat: {
        bases: ['Chicken Breast', 'Ground Beef', 'Steak', 'Pork Chops', 'Bacon', 'Sausage', 'Turkey', 'Lamb Chops', 'Veal', 'Roast Beef', 'Salami', 'Ham', 'Pepperoni', 'Meatballs', 'Hot Dogs', 'Chicken Thighs', 'Chicken Wings', 'Minced Lamb', 'Beef Ribs', 'Meat Cubes'],
        adjectives: ['Fresh', 'Frozen', 'Premium', 'Halal', 'Grass-Fed', 'Free-Range', 'Organic', 'Marinated', 'Spicy', 'Smoked', 'Aged', 'Tender', 'Local', 'Imported'],
        sizes: ['450g', '500g', '1kg', '900g', 'Pack of 6', '1.5kg', '2kg', '250g', 'Tray'],
        brands: ['Al Watania', 'Radwa', 'Alyoum', 'Americana', 'Halwani', 'Tyson', 'Local Butcher', 'Sadia', 'Perdue']
    },
    Seafood: {
        bases: ['Salmon', 'Tuna', 'Shrimp', 'Cod', 'Tilapia', 'Crab', 'Lobster', 'Oysters', 'Mussels', 'Scallops', 'Squid', 'Octopus', 'Halibut', 'Trout', 'Sardines', 'Anchovies', 'Mackerel', 'Hamour', 'Prawns', 'Fish Fillet'],
        adjectives: ['Fresh', 'Frozen', 'Wild-Caught', 'Farmed', 'Premium', 'Smoked', 'Breaded', 'Marinated', 'Canned', 'Cleaned', 'Whole', 'Fillet', 'Jumbo', 'Medium'],
        sizes: ['500g', '1kg', '250g', 'Pack', 'Can (160g)', 'Can (200g)', '400g', '800g', 'Jumbo Pack'],
        brands: ['Sirena', 'Rio Mare', 'Americana', 'Siblou', 'Fish Market', 'Local Catch', 'Ocean Fresh', 'Bumble Bee', 'Starkist']
    },
    Pantry: {
        bases: ['Flour', 'Sugar', 'Salt', 'Black Pepper', 'Olive Oil', 'Vegetable Oil', 'Ketchup', 'Mustard', 'Mayonnaise', 'Pasta', 'Rice', 'Canned Beans', 'Tomato Sauce', 'Peanut Butter', 'Jam', 'Honey', 'Vinegar', 'Soy Sauce', 'Lentils', 'Chickpeas', 'Oats', 'Corn Flakes', 'Spices Mix'],
        adjectives: ['Organic', 'Extra Virgin', 'Pure', 'Premium', 'Whole Grain', 'Refined', 'Unrefined', 'Roasted', 'Creamy', 'Chunky', 'Spicy', 'Mild', 'Canned', 'Dried', 'Gluten-Free', 'Basmati', 'Jasmine'],
        sizes: ['500g', '1kg', '2kg', '5kg', '1L', '500ml', '250ml', 'Jar (400g)', 'Bottle', 'Can (400g)', 'Pack of 3'],
        brands: ['Heinz', 'Kraft', 'Hellmann\'s', 'Barilla', 'Goody', 'Al Alali', 'Afia', 'Noor', 'Abu Kass', 'Al Maha', 'Kellogg\'s', 'Quaker', 'Maggi', 'Knorr', 'Borges', 'RS']
    }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const products = [];
        const generatedNames = new Set();
        let productIdCounter = 1000; // start higher to avoid colliding with original mock data IDs if they are sequential

        for (const [categoryName, traits] of Object.entries(CATEGORIES)) {
            // 100 items per category
            for (let i = 0; i < 100; i++) {
                let name = '';
                let attempts = 0;

                // Try to generate a unique combination
                do {
                    const brand = sample(traits.brands);
                    const adj = sample(traits.adjectives);
                    const base = sample(traits.bases);
                    const size = sample(traits.sizes);

                    // Pattern: "[Brand] [Adjective] [Base] [Size]" or "[Adjective] [Base] by [Brand] [Size]"
                    if (Math.random() > 0.5) {
                        name = `${brand} ${adj} ${base} ${size}`;
                    } else {
                        name = `${adj} ${base} by ${brand} - ${size}`;
                    }
                    attempts++;
                } while (generatedNames.has(name) && attempts < 50);

                // Fallback if unique wasn't found in 50 attempts (unlikely with this many combinations)
                if (generatedNames.has(name)) {
                    name = `${name} (Variant ${i})`;
                }

                generatedNames.add(name);

                products.push({
                    name: name,
                    industry_id: null,
                    category_id: null,
                    description: `High-quality ${categoryName.toLowerCase()} product. Enjoy the best taste and freshness with every purchase. Ideal for daily use and family meals.`,
                    image_url: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(sample(traits.bases))}`,
                    category: categoryName,
                    is_available: true,
                    created_at: new Date()
                });
                productIdCounter++;
            }
        }

        // Insert to DB
        await queryInterface.bulkInsert('products', products, {});
        console.log(`Successfully generated and inserted ${products.length} realistic products.`);
    },

    async down(queryInterface, Sequelize) {
        // Delete only the mock products created by this script by matching the generated pattern or description
        // A safer way is checking the description we set.
        await queryInterface.bulkDelete('products', {
            description: {
                [Sequelize.Op.like]: 'High-quality % product. Enjoy the best taste and freshness%'
            }
        }, {});
    }
};
