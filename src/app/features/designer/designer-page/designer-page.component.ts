import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TemplateService } from '../../../core/services/template.service';
import { CanvasService, CanvasElement } from '../services/canvas.service';
import { ELEMENT_DEFAULTS } from '../../../models/element-defaults';
import { ElementType } from '../../../models/template.model';

@Component({
  selector: 'fc-designer-page',
  standalone: false,
  providers: [CanvasService],
  template: `
    <div class="designer-layout">
      <mat-sidenav-container class="designer-container">
        <!-- Left: Element Palette -->
        <mat-sidenav mode="side" opened position="start" class="palette-sidenav">
          <div class="palette-header">
            <h3>{{ 'designer.elements.text' | translate }}</h3>
          </div>
          <mat-list>
            <mat-list-item
              *ngFor="let el of elementTypes"
              class="palette-item"
              (click)="addElement(el.type)"
            >
              <mat-icon matListItemIcon>{{ el.icon }}</mat-icon>
              <span matListItemTitle>{{ el.label_ar }}</span>
              <span matListItemLine class="palette-en">{{ el.label_en }}</span>
            </mat-list-item>
          </mat-list>
        </mat-sidenav>

        <!-- Center: Canvas -->
        <mat-sidenav-content class="canvas-area">
          <mat-toolbar class="canvas-toolbar">
            <span>{{ templateName }}</span>
            <span class="spacer"></span>
            <button mat-icon-button (click)="canvasService.zoomIn()" matTooltip="Zoom In"><mat-icon>zoom_in</mat-icon></button>
            <button mat-icon-button (click)="canvasService.zoomOut()" matTooltip="Zoom Out"><mat-icon>zoom_out</mat-icon></button>
            <button mat-icon-button (click)="canvasService.toggleSnap()" matTooltip="Snap"><mat-icon>grid_on</mat-icon></button>
            <mat-divider vertical="true"></mat-divider>
            <button mat-icon-button (click)="canvasService.undo()" matTooltip="Undo"><mat-icon>undo</mat-icon></button>
            <button mat-icon-button (click)="canvasService.redo()" matTooltip="Redo"><mat-icon>redo</mat-icon></button>
            <mat-divider vertical="true"></mat-divider>
            <button mat-raised-button color="primary" (click)="save()" [disabled]="!isDirty">
              {{ 'common.save' | translate }}
            </button>
          </mat-toolbar>
          <div id="konva-container" class="konva-container"></div>
        </mat-sidenav-content>

        <!-- Right: Property Panel -->
        <mat-sidenav mode="side" opened position="end" class="property-sidenav">
          <div class="property-header">
            <h3>{{ 'designer.properties.title' | translate }}</h3>
          </div>
          <div *ngIf="selectedElement; else noSelection" class="property-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'designer.properties.key' | translate }}</mat-label>
              <input matInput [value]="selectedElement.data['key']" readonly />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'designer.properties.label_ar' | translate }}</mat-label>
              <input matInput [value]="selectedElement.data['label_ar']" fcAutoDir />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'designer.properties.label_en' | translate }}</mat-label>
              <input matInput [value]="selectedElement.data['label_en']" />
            </mat-form-field>
            <div class="prop-row">
              <mat-form-field appearance="outline">
                <mat-label>X (mm)</mat-label>
                <input matInput type="number" [value]="selectedElement.data['x_mm']" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Y (mm)</mat-label>
                <input matInput type="number" [value]="selectedElement.data['y_mm']" />
              </mat-form-field>
            </div>
            <div class="prop-row">
              <mat-form-field appearance="outline">
                <mat-label>W (mm)</mat-label>
                <input matInput type="number" [value]="selectedElement.data['width_mm']" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>H (mm)</mat-label>
                <input matInput type="number" [value]="selectedElement.data['height_mm']" />
              </mat-form-field>
            </div>
            <mat-slide-toggle [checked]="!!selectedElement.data['required']">
              {{ 'designer.properties.required' | translate }}
            </mat-slide-toggle>
            <button mat-button color="warn" (click)="deleteSelected()" style="margin-top: 16px; width: 100%;">
              <mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}
            </button>
          </div>
          <ng-template #noSelection>
            <p style="padding: 16px; color: #999;">
              Select an element to edit properties
            </p>
          </ng-template>
        </mat-sidenav>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .designer-layout { height: 100vh; display: flex; flex-direction: column; }
    .designer-container { flex: 1; }
    .palette-sidenav { width: 240px; }
    .property-sidenav { width: 300px; }
    .canvas-area { background: #e0e0e0; overflow: auto; }
    .konva-container { display: flex; justify-content: center; padding: 24px; min-height: calc(100vh - 128px); }
    .spacer { flex: 1 1 auto; }
    .palette-header, .property-header { padding: 16px; border-bottom: 1px solid #e0e0e0; }
    .palette-item { cursor: pointer; }
    .palette-item:hover { background: #f5f5f5; }
    .palette-en { font-size: 11px; color: #999; }
    .canvas-toolbar { position: sticky; top: 0; z-index: 10; }
    .property-form { padding: 16px; }
    .full-width { width: 100%; }
    .prop-row { display: flex; gap: 8px; }
    .prop-row mat-form-field { flex: 1; }
  `],
})
export class DesignerPageComponent implements OnInit, AfterViewInit, OnDestroy {
  templateId = '';
  templateName = 'Loading...';
  selectedElement: CanvasElement | null = null;
  isDirty = false;
  elementTypes = Object.values(ELEMENT_DEFAULTS);

  private subs: Subscription[] = [];
  private elementCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private templateService: TemplateService,
    public canvasService: CanvasService
  ) {}

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('templateId') || '';

    this.subs.push(
      this.canvasService.selectedElement$.subscribe((el) => {
        this.selectedElement = el;
      }),
      this.canvasService.dirty$.subscribe((d) => {
        this.isDirty = d;
      })
    );
  }

  ngAfterViewInit(): void {
    if (this.templateId) {
      this.templateService.get(this.templateId).subscribe({
        next: (template: any) => {
          this.templateName = template.name;
          const page = template.pages?.[0];
          const w = page?.width_mm || 210;
          const h = page?.height_mm || 297;
          this.canvasService.init('konva-container', w, h);

          // Load existing elements onto canvas
          for (const el of page?.elements || []) {
            this.canvasService.addElement(el);
          }
          this.canvasService.markClean();
        },
      });
    } else {
      this.canvasService.init('konva-container', 210, 297);
    }
  }

  addElement(type: ElementType): void {
    const defaults = ELEMENT_DEFAULTS[type];
    this.elementCounter++;
    this.canvasService.addElement({
      type,
      key: `${type}_${this.elementCounter}`,
      label_ar: defaults.label_ar,
      label_en: defaults.label_en,
      x_mm: 20,
      y_mm: 20 + this.elementCounter * 12,
      width_mm: defaults.width_mm,
      height_mm: defaults.height_mm,
      required: false,
      direction: 'auto',
      validation: {},
      formatting: {},
    });
  }

  deleteSelected(): void {
    if (this.selectedElement) {
      this.canvasService.removeElement(this.selectedElement.id);
    }
  }

  save(): void {
    const elements = this.canvasService.getElementsData();
    // TODO: batch update elements via API
    this.canvasService.markClean();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.canvasService.destroy();
  }
}
