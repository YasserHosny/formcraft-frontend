import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TemplateService } from '../../../core/services/template.service';
import { CanvasService, CanvasElement } from '../services/canvas.service';
import { ELEMENT_DEFAULTS } from '../../../models/element-defaults';
import { ElementType } from '../../../models/template.model';
import { FormDetectionService } from '../../../core/services/form-detection.service';
import { DetectionResponse, DetectedField } from '../models/detected-field.model';

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
            <button mat-stroked-button color="primary" (click)="openImport()">
              <mat-icon>upload_file</mat-icon>
              Import Cheque
            </button>
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

        <div class="import-panel" *ngIf="showImportPanel">
          <h4>Import Cheque</h4>
          <input type="file" (change)="onFileSelected($event)" accept="image/*" />
          <div class="actions">
            <button mat-flat-button color="primary" (click)="runDetection()" [disabled]="!importFile || loadingDetections">
              <mat-icon>auto_fix_high</mat-icon>
              Detect
            </button>
            <button mat-button (click)="closeImport()">Cancel</button>
          </div>
          <mat-progress-spinner *ngIf="loadingDetections" mode="indeterminate" diameter="28"></mat-progress-spinner>
        </div>

        <div class="detections-panel" *ngIf="showDetectionsPanel">
          <h4>Detections ({{ detections.length }})</h4>
          <div class="actions">
            <button mat-flat-button color="primary" (click)="acceptAll()">Accept All</button>
            <button mat-button color="warn" (click)="rejectAll()">Reject All</button>
          </div>
          <div *ngFor="let d of detections; let i = index" class="detection-card">
            <div class="detection-row">
              <div>
                <strong>{{ d.text || 'Untitled' }}</strong>
                <div class="detection-meta">{{ d.bbox.x | number:'1.0-2' }} , {{ d.bbox.y | number:'1.0-2' }} mm</div>
              </div>
              <span class="badge">{{ d.suggested_type }}</span>
            </div>
            <div class="detection-meta">Confidence: {{ d.confidence | percent:'1.0-0' }}</div>
            <div class="actions" style="margin-top: 8px;">
              <button mat-stroked-button color="primary" (click)="acceptSingle(i)">Accept</button>
              <button mat-button color="warn" (click)="rejectSingle(i)">Reject</button>
            </div>
          </div>
        </div>

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
    .import-panel {
      position: fixed;
      right: 24px;
      top: 90px;
      width: 320px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 200;
      padding: 16px;
    }
    .import-panel h4 { margin: 0 0 12px; }
    .import-panel .actions { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
    .detections-panel {
      position: fixed;
      right: 24px;
      top: 90px;
      width: 360px;
      max-height: 70vh;
      overflow: auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 200;
      padding: 16px;
    }
    .detection-card { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
    .detection-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .detection-meta { font-size: 11px; color: #777; }
    .badge { font-size: 10px; padding: 2px 6px; background: #f2f2f2; border-radius: 999px; }
  `],
})
export class DesignerPageComponent implements OnInit, AfterViewInit, OnDestroy {
  templateId = '';
  templateName = 'Loading...';
  pageId = '';
  selectedElement: CanvasElement | null = null;
  isDirty = false;
  elementTypes = Object.values(ELEMENT_DEFAULTS);

  showImportPanel = false;
  showDetectionsPanel = false;
  importFile: File | null = null;
  detections: DetectedField[] = [];
  detectionId = '';
  loadingDetections = false;
  importPreviewUrl: string | null = null;

  private subs: Subscription[] = [];
  private elementCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private templateService: TemplateService,
    public canvasService: CanvasService,
    private formDetectionService: FormDetectionService
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
          this.pageId = page?.id || '';
          this.canvasService.init('konva-container', w, h);

          if (page?.background_asset) {
            this.canvasService.setBackgroundImage(page.background_asset);
          }

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

  openImport(): void {
    this.showImportPanel = true;
    this.showDetectionsPanel = false;
  }

  closeImport(): void {
    this.showImportPanel = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.importPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.importFile);
    }
  }

  runDetection(): void {
    if (!this.importFile || !this.templateId) return;
    this.loadingDetections = true;
    this.formDetectionService.importForm(this.templateId, this.importFile).subscribe({
      next: (response: DetectionResponse) => {
        this.detections = response.detected_fields;
        this.detectionId = response.id;
        if (response.page_dimensions?.width && response.page_dimensions?.height) {
          this.canvasService.reset('konva-container', response.page_dimensions.width, response.page_dimensions.height);
        }
        if (this.importPreviewUrl) {
          this.canvasService.setBackgroundImage(this.importPreviewUrl);
          if (this.pageId) {
            this.templateService.updatePage(this.pageId, { background_asset: this.importPreviewUrl }).subscribe();
          }
        }
        this.canvasService.setDetections(this.detections);
        this.showDetectionsPanel = true;
        this.showImportPanel = false;
        this.loadingDetections = false;
      },
      error: () => {
        this.loadingDetections = false;
      },
    });
  }

  acceptAll(): void {
    if (!this.templateId || !this.detectionId) return;
    const ids = this.detections.map((_, idx) => idx);
    this.formDetectionService.acceptDetections(this.templateId, this.detectionId, ids).subscribe({
      next: () => {
        this.showDetectionsPanel = false;
        this.detections = [];
        this.canvasService.clearDetections();
        this.reloadTemplate();
      },
    });
  }

  rejectAll(): void {
    if (!this.detectionId) return;
    this.formDetectionService.deleteDetection(this.detectionId).subscribe({
      next: () => {
        this.showDetectionsPanel = false;
        this.detections = [];
        this.canvasService.clearDetections();
      },
    });
  }

  acceptSingle(index: number): void {
    if (!this.templateId || !this.detectionId) return;
    this.formDetectionService
      .acceptDetections(this.templateId, this.detectionId, [index])
      .subscribe({
        next: () => {
          this.detections.splice(index, 1);
          if (this.detections.length === 0) {
            this.showDetectionsPanel = false;
            this.canvasService.clearDetections();
          } else {
            this.canvasService.setDetections(this.detections);
          }
          this.reloadTemplate();
        },
      });
  }

  rejectSingle(index: number): void {
    this.detections.splice(index, 1);
    if (this.detections.length === 0) {
      this.showDetectionsPanel = false;
      this.canvasService.clearDetections();
      if (this.detectionId) {
        this.formDetectionService.deleteDetection(this.detectionId).subscribe();
      }
    } else {
      this.canvasService.setDetections(this.detections);
    }
  }

  private reloadTemplate(): void {
    if (!this.templateId) return;
    this.templateService.get(this.templateId).subscribe({
      next: (template: any) => {
        const page = template.pages?.[0];
        const w = page?.width_mm || 210;
        const h = page?.height_mm || 297;
        this.pageId = page?.id || '';
        this.canvasService.reset('konva-container', w, h);
        if (page?.background_asset) {
          this.canvasService.setBackgroundImage(page.background_asset);
        }
        for (const el of page?.elements || []) {
          this.canvasService.addElement(el);
        }
        this.canvasService.markClean();
      },
    });
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
