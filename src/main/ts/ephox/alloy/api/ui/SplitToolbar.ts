import { Arr, Merger, Option, Fun } from '@ephox/katamari';
import { Css, Width } from '@ephox/sugar';
import { SketchSpec } from '../../api/component/SpecTypes';

import { AlloyComponent } from '../../api/component/ComponentApi';
import * as AlloyParts from '../../parts/AlloyParts';
import * as Overflows from '../../toolbar/Overflows';
import * as SplitToolbarSchema from '../../ui/schema/SplitToolbarSchema';
import { Positioning } from '../behaviour/Positioning';
import { Replacing } from '../behaviour/Replacing';
import { Sliding } from '../behaviour/Sliding';
import * as GuiFactory from '../component/GuiFactory';
import * as SketchBehaviours from '../component/SketchBehaviours';
import { Button } from './Button';
import * as Sketcher from './Sketcher';
import { Toolbar } from './Toolbar';
import { ToolbarGroup } from './ToolbarGroup';
import { SplitToolbarSketcher, SplitToolbarDetail, SplitToolbarSpec } from '../../ui/types/SplitToolbarTypes';
import { CompositeSketchFactory } from '../../api/ui/UiSketcher';
import { LazySink } from '../component/CommonTypes';
import * as Layout from '../../positioning/layout/Layout';
import { Coupling } from '../behaviour/Coupling';
import * as DropdownUtils from '../../dropdown/DropdownUtils';
import { Toggling } from '../behaviour/Toggling';

const setStoredGroups = (bar, storedGroups) => {
  const bGroups = Arr.map(storedGroups, (g) => GuiFactory.premade(g));
  Toolbar.setGroups(bar, bGroups);
};

let visible = false;

const refresh = (toolbar, detail: SplitToolbarDetail, externals) => {
  const primary = AlloyParts.getPartOrDie(toolbar, detail, 'primary');
  // const ps = AlloyParts.getPartsOrDie(toolbar, detail, [ 'primary', 'overflow' ]);
  // const primary = ps.primary();
  const overflow = AlloyParts.getPart(toolbar, detail, 'overflow').getOrThunk(() => detail.overflow().getOrDie('required overflow through getOverflow'));

  // Set the primary toolbar to have visibilty hidden;
  Css.set(primary.element(), 'visibility', 'hidden');

  // Clear the overflow toolbar
  Toolbar.setGroups(overflow, [ ]);

  // Put all the groups inside the primary toolbar
  const groups = detail.builtGroups.get();

  const overflowGroupSpec = ToolbarGroup.sketch({
     ...externals['overflow-group'](),
    items: [
      Button.sketch({
        ...externals['overflow-button'](),
        action (button) {
          if (detail.floating === true) {
            if (visible) {
              Css.set(overflow.element(), 'visibility', 'hidden');
            } else {
              Css.remove(overflow.element(), 'visibility');
            }
            visible = !visible;
          } else {
            // This used to look up the overflow again ... we may need to do that.
            Sliding.toggleGrow(overflow);
          }
        }
      })
    ]
  });
  const overflowGroup = toolbar.getSystem().build(overflowGroupSpec);

  setStoredGroups(primary, groups.concat([ overflowGroup ]));

  const total = Width.get(primary.element());

  const overflows = Overflows.partition(total, groups, (comp) => {
    return Width.get(comp.element());
  }, overflowGroup);

  if (overflows.extra().length === 0) {
    // Not ideal. Breaking abstraction somewhat, though remove is better than insert
    // Can just reset the toolbar groups also ... but may be a bit slower.
    Replacing.remove(primary, overflowGroup);
    Toolbar.setGroups(overflow, [ ]);
    // Maybe remove the overflow drawer.
  } else {
    setStoredGroups(primary, overflows.within());
    setStoredGroups(overflow, overflows.extra());
    // Maybe add the overflow drawer.
  }

  Css.remove(primary.element(), 'visibility');
  Css.reflow(primary.element());

  if (overflow.hasConfigured(Sliding)) {
    Sliding.refresh(overflow);
  }

};

const factory: CompositeSketchFactory<SplitToolbarDetail, SplitToolbarSpec> = (detail, components, spec, externals) => {
  const doSetGroups = (toolbar, groups) => {
    const built = Arr.map(groups, toolbar.getSystem().build);
    detail.builtGroups.set(built);
  };

  const setGroups = (toolbar, groups) => {
    doSetGroups(toolbar, groups);
    refresh(toolbar, detail, externals);
  };

  return {
    uid: detail.uid,
    dom: detail.dom,
    components,
    behaviours: SketchBehaviours.augment(
      detail.splitToolbarBehaviours,
      [ ]
    ),
    apis: {
      setGroups,
      refresh (toolbar) {
        refresh(toolbar, detail, externals);
      }
    },

    domModification: {
      attributes: { role: 'group' }
    }
  };
};

const SplitToolbar = Sketcher.composite({
  name: 'SplitToolbar',
  configFields: SplitToolbarSchema.schema(),
  partFields: SplitToolbarSchema.parts(),
  factory,
  apis: {
    setGroups (apis, toolbar, groups) {
      apis.setGroups(toolbar, groups);
    },
    refresh (apis, toolbar) {
      apis.refresh(toolbar);
    }
  }
}) as SplitToolbarSketcher;

export {
  SplitToolbar
};