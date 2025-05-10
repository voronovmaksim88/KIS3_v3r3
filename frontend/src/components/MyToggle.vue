<script setup>
import { computed } from 'vue';

const sizes = {
  small: {
    fontSize: '12px',
    minWidth: '100px',
    padding: '3px',
    optionPadding: '5px 8px',
    borderRadius: '5px',
    switchHeight: '75%',
    labelGap: '8px'
  },
  medium: {
    fontSize: '14px',
    minWidth: '120px',
    padding: '4px',
    optionPadding: '8px 12px',
    borderRadius: '10px',
    switchHeight: '80%',
    labelGap: '10px'
  },
  large: {
    fontSize: '16px',
    minWidth: '140px',
    padding: '5px',
    optionPadding: '8px 16px',
    borderRadius: '10px',
    switchHeight: '85%',
    labelGap: '12px'
  }
};

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  leftLabel: {
    type: String,
    default: 'Нет'
  },
  rightLabel: {
    type: String,
    default: 'Да'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  activeColor: {
    type: String,
    default: '#2196F3'
  },
  inactiveColor: {
    type: String,
    default: '#f0f0f0'
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue']);

const updateValue = (value) => {
  if (!props.disabled) {
    emit('update:modelValue', value);
  }
};

const containerStyles = computed(() => {
  return {
    fontSize: sizes[props.size].fontSize
  };
});

const sliderStyles = computed(() => {
  return {
    backgroundColor: props.inactiveColor,
    minWidth: sizes[props.size].minWidth,
    padding: sizes[props.size].padding,
    borderRadius: sizes[props.size].borderRadius
  };
});

const switchStyles = computed(() => {
  return {
    backgroundColor: props.activeColor,
    height: sizes[props.size].switchHeight,
    borderRadius: sizes[props.size].borderRadius
  };
});

const optionStyles = computed(() => {
  return {
    padding: sizes[props.size].optionPadding,
    borderRadius: sizes[props.size].borderRadius
  };
});

const wrapperStyles = computed(() => {
  return {
    gap: sizes[props.size].labelGap
  };
});
</script>

<template>
  <div class="toggle-switch-wrapper" :style="wrapperStyles">
    <span v-if="label" class="toggle-switch-label" :class="{ 'disabled': disabled }">
      {{ label }}
    </span>
    <div class="toggle-switch-container" :style="containerStyles">
      <label class="toggle-switch" :class="{ 'disabled': disabled }">
        <input
            type="checkbox"
            :checked="modelValue"
            @change="updateValue($event.target.checked)"
            :disabled="disabled"
        >
        <span class="slider" :style="sliderStyles">
          <span class="option left-option" :style="optionStyles" :class="{ active: !modelValue }">
            {{ leftLabel }}
          </span>
          <span class="switch" :style="switchStyles"></span>
          <span class="option right-option" :style="optionStyles" :class="{ active: modelValue }">
            {{ rightLabel }}
          </span>
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.toggle-switch-wrapper {
  display: inline-flex;
  align-items: center;
  min-height: 100%;
  vertical-align: middle;
}

.toggle-switch-label {
  color: #333;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.toggle-switch-container {
  display: inline-flex;
  align-items: center;
}

.toggle-switch-label.disabled {
  opacity: 0.6;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.toggle-switch.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  position: relative;
}

.option {
  z-index: 1;
  text-align: center;
  flex: 1;
  transition: all 0.3s ease;
  color: #666;
  white-space: nowrap;
  position: relative; /* Добавлено */
}

.option.active {
  color: #fff;
}

.switch {
  position: absolute;
  width: 50%;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  left: 3px;
  z-index: 0; /* Добавлено: убедиться, что переключатель находится под опциями */
}

input:checked + .slider .switch {
  transform: translateX(calc(100% - 6px));
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

@media (hover: hover) {
  .toggle-switch:not(.disabled):hover .slider {
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  }
}

/* Анимация при переключении */
.switch {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
  background-color 0.3s ease;
}

.option {
  transition: color 0.3s ease;
}
</style>