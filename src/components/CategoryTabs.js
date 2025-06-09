import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import MenIcon         from '../assets/Men.svg'; 
import WomenIcon       from '../assets/Women.svg';
import AccessoriesIcon from '../assets/Accessories.svg';
import BeautyIcon      from '../assets/Beauty.svg';

const TABS = [
  { key: 'men',        label: 'Men',         Icon: MenIcon        },
  { key: 'women',      label: 'Women',       Icon: WomenIcon      },
  { key: 'accessories',label: 'Accessories', Icon: AccessoriesIcon},
  { key: 'beauty',     label: 'Beauty',      Icon: BeautyIcon     },
];

export default function CategoryTabs({ selectedKey, onSelect }) {
  return (
    <View style={styles.container}>
      {TABS.map(({ key, label, Icon }) => {
        const active = key === selectedKey;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tabWrapper}
            activeOpacity={0.7}
            onPress={() => onSelect(key)}
          >
            <View style={[styles.circle, active && styles.circleActive]}>
              <Icon
                width={24}
                height={24}
                fill={active ? '#FFF' : '#CCC'}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    paddingHorizontal:24,
    marginTop:        16,
  },
  tabWrapper: {
    alignItems: 'center',
    flex:       1,
  },
  circle: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: '#F5F5F5',
    alignItems:      'center',
    justifyContent:  'center',
  },
  circleActive: {
    backgroundColor: '#3A2C27',
  },
  label: {
    marginTop: 6,
    fontSize:  12,
    color:     '#666',
  },
  labelActive: {
    color:      '#3A2C27',
    fontWeight: '600',
  },
});