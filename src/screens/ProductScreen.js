// src/screens/ProductScreen.js

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

import CleverTap from 'clevertap-react-native';
import Toast from 'react-native-simple-toast';

// 1) Bring in your hooks
import {useCart} from '../context/CartContext';
import {useWishlist} from '../context/WishlistContext';

// 2) SVG icons (make sure metro.config.js is set up for .svg!)
import ArrowLeft from '../../src/assets/ArrowLeft.svg';
import Heart from '../../src/assets/Heart.svg';
import Heartfiled from '../../src/assets/Heartfilled.svg';
import StarIcon from '../../src/assets/Star.svg';
import ArrowRight from '../../src/assets/ArrowRight.svg';

export default function ProductScreen({navigation, route}) {
  // ——————————————————————————————————————
  // 0) Guard: if no product passed in params, bail.
  // ——————————————————————————————————————
  const product = route?.params?.product;

  // ——————————————————————————————————————
  // 1) Cart + Wishlist hooks
  // ——————————————————————————————————————
  const {cartItems, addToCart, incrementItem, decrementItem} = useCart();
  const {isWishlisted, toggleWishlist} = useWishlist();

  // ——————————————————————————————————————
  // 2) Dummy pickers: COLORS & SIZES + state
  // ——————————————————————————————————————
  const COLORS = [
    {name: 'Tan', code: '#C69A6B'},
    {name: 'Black', code: '#000000'},
    {name: 'Rose', code: '#E4646D'},
  ];
  const SIZES = ['S', 'M', 'L', 'XL'];

  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedSize, setSelectedSize] = useState(SIZES[SIZES.length - 1]);

  // record “product clicked” once
  useEffect(() => {
    if (!product) return;
    CleverTap.recordEvent('Product Clicked', {
      id: product.id,
      title: product.title,
      price: product.price,
      productImage : product.thumbnail,
     
    });
  }, [product]);

  if (!product) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>No product data available.</Text>
      </SafeAreaView>
    );
  }

  const wished = isWishlisted(product.id);

  // ——————————————————————————————————————
  // 3) Compute “existingEntry” & quantity now that color/size exist
  // ——————————————————————————————————————
  const existingEntry = cartItems.find(
    item =>
      item.id === product.id &&
      item.color === selectedColor.name &&
      item.size === selectedSize,
  );
  const quantity = existingEntry?.quantity || 0;

  // ——————————————————————————————————————
  // 4) Analytics / Wishlist tap
  // ——————————————————————————————————————
  const onHeartPress = () => {
    toggleWishlist(product.id);
    Toast.show(
      wished ? 'Removed from wishlist' : 'Added to wishlist',
      Toast.SHORT,
    );
    CleverTap.recordEvent(wished ? 'Wishlist Removed' : 'Wishlist Added', {
      id: product.id,
      title: product.title,
      image: product.thumbnail,
    });
  };

  // ——————————————————————————————————————
  // 5) Add-to-cart handler
  // ——————————————————————————————————————
  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      color: selectedColor.name,
      size: selectedSize,
      image: product.thumbnail,
    });
    CleverTap.recordEvent('Add To Cart', {
      id: product.id,
      title: product.title,
      price: product.price,
      color: selectedColor.name,
      size: selectedSize,
      iamge: product.thumbnail,
    });
    
   
  };

  // ——————————————————————————————————————
  // 6) Layout constants
  // ——————————————————————————————————————
  const {height} = Dimensions.get('window');
  const IMAGE_HEIGHT = height * 0.5;
  const imageUrl = product.images?.[0] || product.thumbnail;

  // ——————————————————————————————————————
  // 7) Render
  // ——————————————————————————————————————
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top bar: back + wishlist */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          style={styles.topButton}>
          <ArrowLeft width={20} height={20} fill="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onHeartPress} style={styles.topButton}>
          {wished ? (
            <Heartfiled width={20} height={20} />
          ) : (
            <Heart width={20} height={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Image */}
      <Image
        source={{uri: imageUrl}}
        style={[styles.image, {height: IMAGE_HEIGHT}]}
        resizeMode="cover"
      />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Title & price */}
          <View style={styles.rowSpace}>
            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          </View>

          {/* Rating */}
          <View style={styles.rowSpace}>
            <View style={styles.stars}>
              {Array.from({length: Math.round(product.rating)}).map((_, i) => (
                <StarIcon key={i} width={16} height={16} fill="#4CAF50" />
              ))}
            </View>
            <Text style={styles.reviewCount}>
              ({product.rating.toFixed(1)})
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Color & Size */}
          <View style={styles.pickerRow}>
            <View>
              <Text style={styles.pickerLabel}>Color</Text>
              <View style={styles.optionsRow}>
                {COLORS.map(c => {
                  const sel = c.name === selectedColor.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorCircle,
                        {backgroundColor: c.code},
                        sel && styles.colorCircleSelected,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
            <View>
              <Text style={styles.pickerLabel}>Size</Text>
              <View style={styles.optionsRow}>
                {SIZES.map(sz => {
                  const sel = sz === selectedSize;
                  return (
                    <TouchableOpacity
                      key={sz}
                      onPress={() => setSelectedSize(sz)}
                      style={[
                        styles.sizeCircle,
                        sel && styles.sizeCircleSelected,
                      ]}>
                      <Text
                        style={[
                          styles.sizeText,
                          sel && styles.sizeTextSelected,
                        ]}>
                        {sz}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Description & Reviews nav */}
          {['Description', 'Reviews'].map(label => (
            <TouchableOpacity key={label} style={styles.navRow}>
              <Text style={styles.navLabel}>{label}</Text>
              <ArrowRight width={16} height={16} fill="#AAA" />
            </TouchableOpacity>
          ))}

          <View style={{height: 120}} />
        </ScrollView>

        {/* Add-to-cart vs. +/– controls */}
        {quantity > 0 ? (
          <View style={styles.quantityRow}>
            <TouchableOpacity
              onPress={() =>
                decrementItem({
                  id: product.id,
                  color: selectedColor.name,
                  size: selectedSize,
                })
              }
              style={styles.qtyButton}>
              <Text style={styles.qtySign}>–</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              onPress={() =>
                incrementItem({
                  id: product.id,
                  color: selectedColor.name,
                  size: selectedSize,
                })
              }
              style={styles.qtyButton}>
              <Text style={styles.qtySign}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
            {/* <CartIcon width={20} height={20} fill="#FFF" /> */}
            <Text style={styles.cartButtonText}>Add To Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {fontSize: 16, color: '#666'},

  topBar: {flexDirection: 'row', justifyContent: 'space-between', padding: 16},
  topButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {width: '100%'},

  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    alignSelf: 'center',
    margin: 12,
  },
  scrollContent: {paddingHorizontal: 24},

  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {fontSize: 20, fontWeight: '700'},
  price: {fontSize: 20, fontWeight: '700'},
  stars: {flexDirection: 'row'},
  reviewCount: {marginLeft: 8, fontSize: 14, color: '#666'},

  divider: {height: 1, backgroundColor: '#EEE', marginVertical: 16},

  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pickerLabel: {fontSize: 14, color: '#666', marginBottom: 8},
  optionsRow: {flexDirection: 'row', alignItems: 'center'},

  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  colorCircleSelected: {
    borderColor: '#30241F',
    borderWidth: 2,
  },

  sizeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  sizeCircleSelected: {
    borderColor: '#30241F',
    backgroundColor: '#30241F',
  },
  sizeText: {fontSize: 14, color: '#666'},
  sizeTextSelected: {color: '#FFF', fontWeight: '700'},

  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  navLabel: {fontSize: 16, color: '#1A1A1A'},

  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtySign: {fontSize: 20},
  qtyText: {marginHorizontal: 12, fontSize: 18},

  cartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#30241F',
    paddingVertical: 16,
    borderRadius: 30,
    margin: 16,
  },
  cartButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
