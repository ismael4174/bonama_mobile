import React, {useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

const SubMenu = ({items}) => {
  return (
    <View>
      {items.map((item, index) => (
        <TouchableOpacity key={index} onPress={item.onPress}>
          <Text>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SubMenu;
