## Component Reference Updates

### File 1: GlobalModalWrapper.tsx

**Location**: `src/components/layout/GlobalModalWrapper.tsx`

**Change Required**: Replace ProductionEntryForm usage with RecordProductionModal

**Before**:
```tsx
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'

// ... in render section ...
{/* Production Recording Modal */}
<Modal isOpen={/*...*/} onClose={handleCloseModal}>
  <ProductionEntryForm
    farmId={farmId}
    animals={animals}
    onSuccess={handleRecordSuccess}
  />
</Modal>
```

**After**:
```tsx
import { RecordProductionModal } from '@/components/production/RecordProductionModal'
import { ProductionSettings } from '@/types/production-distribution-settings'

// ... make sure productionSettings is available from your props ...

// ... in render section ...
{/* Production Recording Modal */}
<RecordProductionModal
  isOpen={/*same condition as before*/}
  onClose={handleCloseModal}
  farmId={farmId}
  animals={animals}
  settings={productionSettings} {/* Add this */}
  onSuccess={handleRecordSuccess}
/>
```

---

### File 2: AnimalProductionRecords.tsx

**Location**: `src/components/animals/AnimalProductionRecords.tsx`

**Change Required**: Replace ProductionEntryForm usage with RecordProductionModal

Find the section that opens the production entry modal and update it:

**Before**:
```tsx
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'

// ... somewhere in the component ...
{recordingModalOpen && (
  <Modal isOpen={recordingModalOpen} onClose={() => setRecordingModalOpen(false)}>
    <ProductionEntryForm
      farmId={farmId}
      animals={filteredAnimals}
      onSuccess={() => {
        setRecordingModalOpen(false)
        // refresh data if needed
      }}
    />
  </Modal>
)}
```

**After**:
```tsx
import { RecordProductionModal } from '@/components/production/RecordProductionModal'
import { ProductionSettings } from '@/types/production-distribution-settings'

// ... make sure productionSettings is available or fetch it ...

// ... somewhere in the component ...
{recordingModalOpen && (
  <RecordProductionModal
    isOpen={recordingModalOpen}
    onClose={() => setRecordingModalOpen(false)}
    farmId={farmId}
    animals={filteredAnimals}
    settings={productionSettings} {/* Add this */}
    onSuccess={() => {
      setRecordingModalOpen(false)
      // refresh data if needed
    }}
  />
)}
```

---

### How to Get productionSettings:

If not already available in the component, you can fetch it:

```tsx
import { getProductionSettings } from '@/lib/database/production-settings'

// In your useEffect or on component load:
useEffect(() => {
  const fetchSettings = async () => {
    const settings = await getProductionSettings(farmId)
    setProductionSettings(settings)
  }
  fetchSettings()
}, [farmId])
```

---

### After Updating Both Files:

1. Test that the modal opens correctly
2. Record a production entry (individual)
3. Record a group of animals
4. Verify data saves to database
5. Delete ProductionEntryForm.tsx:

```bash
rm src/components/production/ProductionEntryForm.tsx
```

---

### Import Changes Checklist:

- [ ] Remove: `import { ProductionEntryForm } ...`
- [ ] Add: `import { RecordProductionModal } ...`
- [ ] Add: `import { ProductionSettings } ...` (if not already there)
- [ ] Test component renders
- [ ] Test modal opens/closes
- [ ] Test production recording works
- [ ] Delete old ProductionEntryForm.tsx file
